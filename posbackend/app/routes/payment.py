
from datetime import datetime
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
from pydantic import BaseModel
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


class PaymentRequest(BaseModel):
    plan: str


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
# GET VALID SUBSCRIPTION
# ==========================================

def get_valid_subscription(
    db: Session,
    business_id: str,
):
    subscription = (
        db.query(BusinessSubscription)
        .filter(
            BusinessSubscription.business_id == business_id
        )
        .first()
    )

    if not subscription:
        return None

    now = datetime.utcnow()

    # Active and cancelled subscriptions both expire
    # when their paid period ends.
    if (
        subscription.status in ["active", "cancelled"]
        and subscription.expires_at is not None
        and subscription.expires_at <= now
    ):
        subscription.status = "expired"

        db.commit()
        db.refresh(subscription)

    return subscription


# ==========================================
# SHARED SUBSCRIPTION ACTIVATION
# ==========================================

def activate_subscription(
    db: Session,
    payment: Payment,
    plan: SubscriptionPlan,
):
    now = datetime.utcnow()

    subscription = (
        db.query(BusinessSubscription)
        .filter(
            BusinessSubscription.business_id
            == payment.business_id
        )
        .with_for_update()
        .first()
    )

    # Extend an existing unexpired subscription.
    # This also supports a customer who cancelled
    # but still has paid time remaining.
    if (
        subscription
        and subscription.status in ["active", "cancelled"]
        and subscription.expires_at is not None
        and subscription.expires_at > now
    ):
        start_at = subscription.expires_at
    else:
        start_at = now

    # Calculate expiry using calendar days, months or years.
    expires_at = calculate_expiry(start_at, plan)

    if subscription:
        subscription.plan_id = plan.id
        subscription.status = "active"
        subscription.started_at = start_at
        subscription.expires_at = expires_at

    else:
        subscription = BusinessSubscription(
            business_id=payment.business_id,
            plan_id=plan.id,
            status="active",
            started_at=start_at,
            expires_at=expires_at,
        )

        db.add(subscription)

    payment.status = "success"
    payment.paid_at = now

    return subscription


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
                payload.plan.strip()
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

    if plan.price is None or plan.price <= 0:
        raise HTTPException(
            status_code=400,
            detail="This plan cannot be purchased through this checkout.",
        )

    reference = str(uuid4())

    # Save the transaction before contacting Paystack.
    payment = Payment(
        business_id=business_id,
        plan_id=plan.id,
        amount=plan.price,
        provider="Paystack",
        reference=reference,
        status="pending",
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    try:
        response = initialize_payment(
            email=email,
            amount=plan.price,
            reference=reference,
            callback_url=(
                f"{frontend_url}/payment-success"
            ),
            business_id=business_id,
            plan=plan.name,
        )

    except Exception:
        payment.status = "failed"
        db.commit()

        raise HTTPException(
            status_code=502,
            detail="Unable to connect to the payment provider.",
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

    authorization_url = (
        response.get("data", {}).get("authorization_url")
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
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment reference not found for this business.",
        )

    # Prevent the same payment from activating twice.
    if payment.status == "success":
        subscription = (
            db.query(BusinessSubscription)
            .filter(
                BusinessSubscription.business_id == business_id
            )
            .first()
        )

        return {
            "message": "Payment already verified.",
            "payment_status": "success",
            "subscription_status": (
                subscription.status if subscription else "inactive"
            ),
            "plan_id": payment.plan_id,
            "expires": (
                subscription.expires_at
                if subscription else None
            ),
        }

    if payment.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"This payment is {payment.status}.",
        )

    try:
        response = verify_payment(reference)

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Unable to verify payment with the provider.",
        )

    if not response or not response.get("status"):
        raise HTTPException(
            status_code=400,
            detail="Payment verification failed.",
        )

    data = response.get("data") or {}

    if data.get("reference") != reference:
        raise HTTPException(
            status_code=400,
            detail="Payment reference does not match.",
        )

    if data.get("status") != "success":
        payment.status = "failed"
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="Payment was not successful.",
        )

    # Validate amount.
    try:
        paid_amount_kobo = int(data["amount"])

        expected_amount_kobo = round(
            float(payment.amount) * 100
        )

    except (KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Invalid amount in payment verification response.",
        )

    if paid_amount_kobo != expected_amount_kobo:
        raise HTTPException(
            status_code=400,
            detail="The verified payment amount does not match.",
        )

    if data.get("currency") != "NGN":
        raise HTTPException(
            status_code=400,
            detail="Unexpected payment currency.",
        )

    # Get the purchased plan from our database.
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

    try:
        subscription = activate_subscription(
            db=db,
            payment=payment,
            plan=plan,
        )

        db.commit()
        db.refresh(subscription)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Subscription activation failed. "
                "Please retry verification before paying again."
            ),
        )

    return {
        "message": "Subscription activated successfully.",
        "payment_status": payment.status,
        "plan": plan.name,
        "subscription_status": subscription.status,
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

    subscription = get_valid_subscription(
        db,
        business_id,
    )

    if not subscription:
        return {
            "status": "inactive",
            "plan": None,
            "expires": None,
        }

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.id == subscription.plan_id
        )
        .first()
    )

    return {
        "status": subscription.status,
        "plan": plan.name if plan else None,
        "expires": subscription.expires_at,
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

    now = datetime.utcnow()

    if (
        not subscription.expires_at
        or subscription.expires_at <= now
    ):
        subscription.status = "expired"
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="Your subscription has already expired.",
        )

    # Cancellation does not remove paid access immediately.
    # The subscription remains valid until expires_at.
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

    # Verify the original request body.
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

    # Only process successful payment notifications.
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

    # Prevent duplicate activation.
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

    # Verify directly with Paystack.
    try:
        response = verify_payment(reference)

    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Unable to verify transaction; retry later.",
        )

    if not response or not response.get("status"):
        raise HTTPException(
            status_code=503,
            detail=(
                "Transaction verification is temporarily unavailable."
            ),
        )

    data = response.get("data") or {}

    if (
        data.get("reference") != reference
        or data.get("status") != "success"
    ):
        return {
            "received": True,
            "ignored": True,
        }

    # Validate amount and currency.
    try:
        paid_amount_kobo = int(data["amount"])

        expected_amount_kobo = round(
            float(payment.amount) * 100
        )

    except (KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=503,
            detail="Unable to validate transaction amount.",
        )

    if (
        paid_amount_kobo != expected_amount_kobo
        or data.get("currency") != "NGN"
    ):
        raise HTTPException(
            status_code=400,
            detail="Transaction amount or currency does not match.",
        )

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.id == payment.plan_id
        )
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=503,
            detail="Purchased plan is temporarily unavailable.",
        )

    try:
        subscription = activate_subscription(
            db=db,
            payment=payment,
            plan=plan,
        )

        db.commit()
        db.refresh(subscription)

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
