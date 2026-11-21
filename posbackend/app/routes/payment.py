
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Literal
from uuid import uuid4
import os
import hashlib
import hmac
import json

from fastapi import (
    Request,
    APIRouter,
    Depends,
    HTTPException,
)
from pydantic import BaseModel, Field, AliasChoices
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user

from app.models.payment import Payment
from app.models.business_subscription import BusinessSubscription
from app.models.subscription_plan import SubscriptionPlan

from app.services.paystack import (
    initialize_payment,
    verify_payment,
)

from app.services.subscription_dates import calculate_expiry


router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)


SUPPORTED_PAYMENT_CURRENCIES = {"NGN", "USD"}
VALID_BILLING_INTERVALS = {"monthly", "yearly"}
VALID_SUBSCRIPTION_STATUSES = {
    "active",
    "cancelled",
    "trialing",
}


# ==========================================
# DATETIME HELPERS
# ==========================================

def utc_now_naive():
    """
    Return current UTC time without timezone information.

    The database models use DateTime without timezone=True.
    """

    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_utc_naive(value):
    """
    Normalize aware or naive datetimes to naive UTC.
    """

    if value is None:
        return None

    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)

    return value


def is_subscription_expired(subscription) -> bool:
    """
    Treat a missing expiry date as invalid.
    """

    if subscription.expires_at is None:
        return True

    expiry = to_utc_naive(subscription.expires_at)

    return expiry <= utc_now_naive()


def get_effective_subscription_status(subscription) -> str:
    """
    Calculate the effective status without committing changes.

    This is used when displaying subscription information.
    """

    status = (subscription.status or "").strip().lower()

    if status not in VALID_SUBSCRIPTION_STATUSES:
        return status or "inactive"

    if is_subscription_expired(subscription):
        return "expired"

    return status


# ==========================================
# PAYMENT REQUEST
# ==========================================

class PaymentRequest(BaseModel):
    plan_name: str = Field(
        validation_alias=AliasChoices("plan_name", "plan")
    )

    billing_interval: Literal["monthly", "yearly"] = "monthly"

    # Currency must be explicitly selected.
    payment_currency: Literal["NGN", "USD"]


# ==========================================
# BUSINESS ID
# ==========================================

def get_business_id(user) -> str:
    business_id = user.get("business_id")

    if not business_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business.",
        )

    return str(business_id)


# ==========================================
# MONEY HELPERS
# ==========================================

def to_decimal(value) -> Decimal:
    try:
        result = Decimal(str(value)).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

        if not result.is_finite():
            raise ValueError

        return result

    except (InvalidOperation, TypeError, ValueError):
        raise ValueError("Invalid monetary amount.")


def get_plan_price(
    plan: SubscriptionPlan,
    billing_interval: str,
    payment_currency: str,
) -> Decimal:

    currency = payment_currency.upper()

    if currency not in SUPPORTED_PAYMENT_CURRENCIES:
        raise ValueError("Unsupported payment currency.")

    if billing_interval == "monthly":
        field = f"monthly_price_{currency.lower()}"

    elif billing_interval == "yearly":
        field = f"yearly_price_{currency.lower()}"

    else:
        raise ValueError("Unsupported billing interval.")

    value = getattr(plan, field, None)

    return to_decimal(value)


def amount_to_minor_units(amount: Decimal) -> int:
    amount_decimal = to_decimal(amount)

    if amount_decimal <= Decimal("0.00"):
        raise ValueError("Payment amount must be greater than zero.")

    return int(
        (amount_decimal * Decimal("100")).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )
    )


# ==========================================
# VALIDATE VERIFIED PAYSTACK TRANSACTION
# ==========================================

def validate_paystack_transaction(
    data: dict,
    payment: Payment,
) -> str:

    if data.get("reference") != payment.reference:
        raise HTTPException(
            status_code=400,
            detail="Payment reference does not match.",
        )

    if data.get("status") != "success":
        raise HTTPException(
            status_code=400,
            detail="Payment was not successful.",
        )

    verified_currency = (
        data.get("currency") or ""
    ).strip().upper()

    if verified_currency not in SUPPORTED_PAYMENT_CURRENCIES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported payment currency returned by provider.",
        )

    if payment.payment_currency:
        expected_currency = payment.payment_currency.upper()

        if verified_currency != expected_currency:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Verified payment currency does not match "
                    "the initialized payment."
                ),
            )

    try:
        paid_amount_minor = int(data["amount"])

        expected_amount_minor = amount_to_minor_units(
            to_decimal(payment.amount)
        )

    except (
        KeyError,
        TypeError,
        ValueError,
        InvalidOperation,
        OverflowError,
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid amount in payment verification response.",
        )

    if paid_amount_minor != expected_amount_minor:
        raise HTTPException(
            status_code=400,
            detail="The verified payment amount does not match.",
        )

    return verified_currency


# ==========================================
# GET SUBSCRIPTION RECORD
# ==========================================

def get_subscription_record(
    db: Session,
    business_id: str,
):
    return (
        db.query(BusinessSubscription)
        .filter(
            BusinessSubscription.business_id == business_id
        )
        .first()
    )


# ==========================================
# SUBSCRIPTION ACTIVATION
# ==========================================

def activate_subscription(
    db: Session,
    payment: Payment,
    plan: SubscriptionPlan,
):
    now = utc_now_naive()

    if not payment.payment_currency:
        raise HTTPException(
            status_code=400,
            detail="Verified payment currency is missing.",
        )

    payment_currency = payment.payment_currency.upper()

    if payment_currency not in SUPPORTED_PAYMENT_CURRENCIES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported verified payment currency.",
        )

    billing_interval = payment.billing_interval

    if billing_interval is not None:
        if billing_interval not in VALID_BILLING_INTERVALS:
            raise HTTPException(
                status_code=400,
                detail="Invalid payment billing interval.",
            )

    subscription = (
        db.query(BusinessSubscription)
        .filter(
            BusinessSubscription.business_id
            == payment.business_id
        )
        .with_for_update()
        .first()
    )

    # Preserve remaining access for an unexpired paid
    # subscription, including one that was cancelled.
    #
    # A trial upgrade starts the paid subscription immediately.
    # An expired subscription also starts from the current time.

    if (
        subscription
        and subscription.status in {"active", "cancelled"}
        and subscription.expires_at is not None
        and to_utc_naive(subscription.expires_at) > now
    ):
        start_at = to_utc_naive(subscription.expires_at)

    else:
        start_at = now

    try:
        expires_at = calculate_expiry(
            start_at,
            plan,
            billing_interval,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    if subscription:
        subscription.plan_id = plan.id
        subscription.status = "active"
        subscription.started_at = start_at
        subscription.expires_at = expires_at

        subscription.billing_interval = billing_interval

        subscription.payment_currency = payment_currency
        subscription.amount_paid = payment.amount

    else:
        subscription = BusinessSubscription(
            business_id=payment.business_id,
            plan_id=plan.id,
            status="active",
            billing_interval=billing_interval,
            payment_currency=payment_currency,
            amount_paid=payment.amount,
            started_at=start_at,
            expires_at=expires_at,
        )

        db.add(subscription)

    payment.status = "success"
    payment.paid_at = now

    return subscription


# ==========================================
# SHARED PAYMENT PROCESSOR
# ==========================================

def process_verified_payment(
    db: Session,
    payment: Payment,
):
    if payment.status == "success":
        return None

    if payment.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"This payment is {payment.status}.",
        )

    try:
        response = verify_payment(payment.reference)

    except Exception:
        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to verify payment with the provider. "
                "Please retry."
            ),
        )

    if not response or not response.get("status"):
        raise HTTPException(
            status_code=503,
            detail="Payment verification is temporarily unavailable.",
        )

    data = response.get("data") or {}

    verified_currency = validate_paystack_transaction(
        data,
        payment,
    )

    # Record the actual currency returned by Paystack.
    payment.payment_currency = verified_currency

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.id == payment.plan_id
        )
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="The purchased plan no longer exists.",
        )

    return activate_subscription(
        db=db,
        payment=payment,
        plan=plan,
    )


# ==========================================
# INITIALIZE PAYMENT
# ==========================================

@router.post("/initialize")
def initialize_subscription_payment(
    payload: PaymentRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = get_business_id(user)
    email = user.get("email")

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Your account email is missing.",
        )

    payment_currency = payload.payment_currency.upper()

    if payment_currency not in SUPPORTED_PAYMENT_CURRENCIES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported payment currency.",
        )

    frontend_url = os.getenv(
        "FRONTEND_URL", ""
    ).rstrip("/")

    if not frontend_url:
        raise HTTPException(
            status_code=500,
            detail="FRONTEND_URL is not configured.",
        )

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.name.ilike(
                payload.plan_name.strip()
            ),
            SubscriptionPlan.active.is_(True),
        )
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Active subscription plan not found.",
        )

    if plan.custom_pricing:
        raise HTTPException(
            status_code=400,
            detail=(
                "This plan requires a custom quotation "
                "and cannot be purchased through checkout."
            ),
        )

    try:
        amount = get_plan_price(
            plan=plan,
            billing_interval=payload.billing_interval,
            payment_currency=payment_currency,
        )

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="The selected plan has an invalid price.",
        )

    if amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=400,
            detail=(
                f"This plan has no configured "
                f"{payment_currency} price for the selected interval."
            ),
        )

    reference = str(uuid4())

    payment = Payment(
        business_id=business_id,
        plan_id=plan.id,
        amount=amount,
        provider="Paystack",
        reference=reference,
        status="pending",
        payment_type="initial",
        billing_interval=payload.billing_interval,
        payment_currency=payment_currency,
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    try:
        response = initialize_payment(
            email=email,
            amount=amount,
            reference=reference,
            callback_url=f"{frontend_url}/payment-success",
            business_id=business_id,
            plan=plan.name,
            currency=payment_currency,
        )

    except Exception:
        payment.status = "failed"
        db.commit()

        raise HTTPException(
            status_code=502,
            detail="Unable to initialize payment with the provider.",
        )

    if not response or not response.get("status"):
        payment.status = "failed"
        db.commit()

        raise HTTPException(
            status_code=400,
            detail=(
                response.get(
                    "message",
                    "Payment initialization failed.",
                )
                if response
                else "Payment initialization failed."
            ),
        )

    response_data = response.get("data") or {}

    authorization_url = response_data.get(
        "authorization_url"
    )

    if not authorization_url:
        payment.status = "failed"
        db.commit()

        raise HTTPException(
            status_code=502,
            detail="Payment checkout URL was not returned.",
        )

    return {
        "authorization_url": authorization_url,
        "reference": reference,
        "amount": str(amount),
        "currency": payment.payment_currency,
        "billing_interval": payment.billing_interval,
    }


# ==========================================
# VERIFY PAYMENT
# ==========================================

@router.get("/verify/{reference}")
def verify_subscription(
    reference: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = get_business_id(user)

    payment = (
        db.query(Payment)
        .filter(
            Payment.reference == reference,
            Payment.business_id == business_id,
        )
        .with_for_update()
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment reference not found for this business.",
        )

    if payment.status == "success":
        subscription = get_subscription_record(
            db,
            business_id,
        )

        return {
            "message": "Payment already verified.",
            "payment_status": "success",
            "subscription_status": (
                get_effective_subscription_status(subscription)
                if subscription
                else "inactive"
            ),
            "plan_id": payment.plan_id,
            "payment_currency": payment.payment_currency,
            "expires": (
                subscription.expires_at
                if subscription
                else None
            ),
        }

    try:
        subscription = process_verified_payment(
            db=db,
            payment=payment,
        )

        db.commit()

        if subscription:
            db.refresh(subscription)

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Subscription activation failed. "
                "Please retry verification before paying again."
            ),
        )

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.id == payment.plan_id
        )
        .first()
    )

    return {
        "message": "Subscription activated successfully.",
        "payment_status": payment.status,
        "plan": plan.name if plan else None,
        "subscription_status": subscription.status,
        "billing_interval": subscription.billing_interval,
        "payment_currency": subscription.payment_currency,
        "amount_paid": str(subscription.amount_paid),
        "expires": subscription.expires_at,
    }


# ==========================================
# GET CURRENT SUBSCRIPTION
# ==========================================

@router.get("/subscription")
def get_subscription(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = get_business_id(user)

    subscription = get_subscription_record(
        db,
        business_id,
    )

    if not subscription:
        return {
            "status": "inactive",
            "plan": None,
            "expires": None,
            "billing_interval": None,
            "payment_currency": None,
            "amount_paid": None,
        }

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.id == subscription.plan_id
        )
        .first()
    )

    return {
        "status": get_effective_subscription_status(subscription),
        "plan": plan.name if plan else None,
        "expires": subscription.expires_at,
        "billing_interval": subscription.billing_interval,
        "payment_currency": subscription.payment_currency,
        "amount_paid": str(subscription.amount_paid),
    }


# ==========================================
# CANCEL SUBSCRIPTION
# ==========================================

@router.post("/cancel")
def cancel_subscription(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = get_business_id(user)

    subscription = (
        db.query(BusinessSubscription)
        .filter(
            BusinessSubscription.business_id == business_id
        )
        .with_for_update()
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=404,
            detail="Subscription not found.",
        )

    if subscription.status != "active":
        raise HTTPException(
            status_code=400,
            detail="There is no active subscription to cancel.",
        )

    if is_subscription_expired(subscription):
        subscription.status = "expired"
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="Your subscription has already expired.",
        )

    subscription.status = "cancelled"

    db.commit()
    db.refresh(subscription)

    return {
        "message": "Subscription cancelled successfully.",
        "status": subscription.status,
        "expires_at": subscription.expires_at,
        "access_until": subscription.expires_at,
    }


# ==========================================
# PAYSTACK WEBHOOK
# ==========================================

@router.post("/webhook")
async def paystack_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    secret = os.getenv("PAYSTACK_SECRET_KEY")

    if not secret:
        raise HTTPException(
            status_code=500,
            detail="Payment provider is not configured.",
        )

    body = await request.body()

    signature = request.headers.get(
        "x-paystack-signature"
    )

    expected_signature = hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha512,
    ).hexdigest()

    if (
        not signature
        or not hmac.compare_digest(
            expected_signature,
            signature,
        )
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid webhook signature.",
        )

    try:
        event = json.loads(body)

    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid webhook payload.",
        )

    if event.get("event") != "charge.success":
        return {
            "received": True,
            "ignored": True,
        }

    event_data = event.get("data") or {}
    reference = event_data.get("reference")

    if not reference:
        return {
            "received": True,
            "ignored": True,
        }

    payment = (
        db.query(Payment)
        .filter(
            Payment.reference == reference
        )
        .with_for_update()
        .first()
    )

    if not payment:
        return {
            "received": True,
            "ignored": True,
        }

    if payment.status == "success":
        return {
            "received": True,
            "already_processed": True,
        }

    if payment.status != "pending":
        return {
            "received": True,
            "ignored": True,
        }

    try:
        subscription = process_verified_payment(
            db=db,
            payment=payment,
        )

        db.commit()

        if subscription:
            db.refresh(subscription)

    except HTTPException as exc:
        db.rollback()

        if exc.status_code >= 500:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Transaction verification is temporarily "
                    "unavailable."
                ),
            )

        raise

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=503,
            detail="Subscription activation failed; retry later.",
        )

    return {
        "received": True,
        "payment_status": "success",
        "subscription_status": "active",
    }
