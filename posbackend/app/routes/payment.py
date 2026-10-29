
from datetime import datetime, timedelta
from uuid import uuid4
import os
import hashlib
import hmac

from fastapi import Request
import json

from fastapi import APIRouter, Depends, HTTPException
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

router = APIRouter(prefix="/payments", tags=["Payments"])


class PaymentRequest(BaseModel):
    plan: str


def get_business_id(user) -> str:
    business_id = user.get("business_id")
    if not business_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business.",
        )
    return str(business_id)


def get_valid_subscription(db: Session, business_id: str):
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

    if (
        subscription.status == "active"
        and subscription.expires_at is not None
        and subscription.expires_at <= now
    ):
        subscription.status = "expired"
        db.commit()

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

    frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")
    if not frontend_url:
        raise HTTPException(
            status_code=500,
            detail="FRONTEND_URL is not configured.",
        )

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.name.ilike(payload.plan.strip()),
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

    # Record the intended transaction BEFORE calling Paystack.
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
            callback_url=f"{frontend_url}/payment-success",
            business_id=business_id,
            plan=plan.name,
        )
    except Exception:
        db.rollback()
        payment = (
            db.query(Payment)
            .filter(Payment.reference == reference)
            .first()
        )
        if payment and payment.status == "pending":
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
                response.get("message", "Payment initialization failed.")
                if response else "Payment initialization failed."
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
# VERIFY PAYMENT AND ACTIVATE SUBSCRIPTION
# ==========================================
@router.get("/verify/{reference}")
def verify_subscription(
    reference: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = get_business_id(user)

    # Only verify a transaction that this application initialized
    # for the authenticated business.
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

    # Idempotency: do not activate the same payment twice.
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
                subscription.expires_at if subscription else None
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

    # Paystack amounts are returned in kobo for NGN.
    try:
        paid_amount_kobo = int(data["amount"])
        expected_amount_kobo = round(float(payment.amount) * 100)
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

    # Use our stored payment record, not untrusted metadata,
    # to identify which plan should be activated.
    plan = (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.id == payment.plan_id)
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="The purchased plan no longer exists.",
        )

    now = datetime.utcnow()

    try:
        subscription = (
            db.query(BusinessSubscription)
            .filter(
                BusinessSubscription.business_id == business_id
            )
            .with_for_update()
            .first()
        )

        # Extend an existing unexpired subscription from its
        # current expiry; otherwise start from now.
        if (
            subscription
            and subscription.status == "active"
            and subscription.expires_at
            and subscription.expires_at > now
        ):
            start_at = subscription.expires_at
        else:
            start_at = now

        expires_at = start_at + timedelta(
            days=plan.duration_days or 30
        )

        if subscription:
            subscription.plan_id = plan.id
            subscription.status = "active"
            subscription.started_at = now
            subscription.expires_at = expires_at
        else:
            subscription = BusinessSubscription(
                business_id=business_id,
                plan_id=plan.id,
                status="active",
                started_at=now,
                expires_at=expires_at,
            )
            db.add(subscription)

        payment.status = "success"
        payment.paid_at = now

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

    subscription = get_valid_subscription(db, business_id)

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

    subscription.status = "cancelled"
    db.commit()

    return {
        "message": "Subscription cancelled successfully.",
        "status": subscription.status,
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

    # Read the original request body for signature verification.
    body = await request.body()
    signature = request.headers.get("x-paystack-signature")

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

    # We only process successful transaction notifications.
    if event.get("event") != "charge.success":
        return {"received": True, "ignored": True}

    event_data = event.get("data") or {}
    reference = event_data.get("reference")

    if not reference:
        return {"received": True, "ignored": True}

    # Find the payment created by DGTrack POS.
    payment = (
        db.query(Payment)
        .filter(Payment.reference == reference)
        .with_for_update()
        .first()
    )

    # Unknown references must never create subscriptions.
    if not payment:
        return {"received": True, "ignored": True}

    # Prevent duplicate notifications from activating twice.
    if payment.status == "success":
        return {"received": True, "already_processed": True}

    if payment.status != "pending":
        return {"received": True, "ignored": True}

    # Verify the transaction directly with Paystack.
    try:
        response = verify_payment(reference)
    except Exception:
        # A server error lets Paystack retry the notification.
        raise HTTPException(
            status_code=503,
            detail="Unable to verify transaction; retry later.",
        )

    if not response or not response.get("status"):
        raise HTTPException(
            status_code=503,
            detail="Transaction verification is temporarily unavailable.",
        )

    data = response.get("data") or {}

    if (
        data.get("reference") != reference
        or data.get("status") != "success"
    ):
        return {"received": True, "ignored": True}

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
        .filter(SubscriptionPlan.id == payment.plan_id)
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=503,
            detail="Purchased plan is temporarily unavailable.",
        )

    now = datetime.utcnow()

    try:
        subscription = (
            db.query(BusinessSubscription)
            .filter(
                BusinessSubscription.business_id
                == payment.business_id
            )
            .with_for_update()
            .first()
        )

        if (
            subscription
            and subscription.status == "active"
            and subscription.expires_at
            and subscription.expires_at > now
        ):
            start_at = subscription.expires_at
        else:
            start_at = now

        expires_at = start_at + timedelta(
            days=plan.duration_days or 30
        )

        if subscription:
            subscription.plan_id = plan.id
            subscription.status = "active"
            subscription.started_at = now
            subscription.expires_at = expires_at
        else:
            subscription = BusinessSubscription(
                business_id=payment.business_id,
                plan_id=plan.id,
                status="active",
                started_at=now,
                expires_at=expires_at,
            )
            db.add(subscription)

        payment.status = "success"
        payment.paid_at = now

        db.commit()

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
