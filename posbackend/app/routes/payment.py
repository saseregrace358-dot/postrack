from datetime import datetime, timedelta
from uuid import uuid4
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user

from app.models.payment import Payment
from app.models.business_subscription import BusinessSubscription
from app.models.subscription_plan import SubscriptionPlan
from sqlalchemy import func
from app.services.paystack import (
    initialize_payment,
    verify_payment,
)

router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)


class PaymentRequest(BaseModel):
    plan: str


# Fallback prices (used when initializing payment)
PLAN_PRICES = {
    "starter": 5000,
    "professional": 15000,
    "enterprise": 30000,
}


# ==========================================
# INITIALIZE PAYMENT
# ==========================================
@router.post("/initialize")
def initialize_subscription_payment(
    payload: PaymentRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):

    print("Received plan:", payload.plan)

    plans = db.query(SubscriptionPlan).all()

    print("Plans in database:")

    for p in plans:
        print(p.id, p.name)

    plan = (
    db.query(SubscriptionPlan)
    .filter(
        func.lower(SubscriptionPlan.name)
        == payload.plan.lower()
    )
    .first()
)

    print("Matched plan:", plan)

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Subscription plan not found",
        )
    

# ==========================================
# VERIFY PAYMENT
# ==========================================
@router.get("/verify/{reference}")
def verify_subscription(
    reference: str,
    db: Session = Depends(get_db),
):

    response = verify_payment(reference)

    if not response["status"]:
        raise HTTPException(
            status_code=400,
            detail="Unable to verify payment",
        )

    data = response["data"]

    if data["status"] != "success":
        raise HTTPException(
            status_code=400,
            detail="Payment not successful",
        )

    existing_payment = (
        db.query(Payment)
        .filter(Payment.reference == reference)
        .first()
    )

    if existing_payment:
        return {
            "message": "Payment already verified",
            "subscription": "active",
        }

    metadata = data.get("metadata", {})

    business_id = metadata.get("business_id")
    plan_name = metadata.get("plan")

    plan = (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.name == plan_name)
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Subscription plan not found",
        )

    payment = Payment(
        business_id=business_id,
        plan_id=plan.id,
        provider="Paystack",
        reference=reference,
        amount=data["amount"] / 100,
        status="success",
        paid_at=datetime.utcnow(),
    )

    db.add(payment)

    subscription = (
        db.query(BusinessSubscription)
        .filter(
            BusinessSubscription.business_id == business_id
        )
        .first()
    )

    if subscription:

        subscription.plan_id = plan.id
        subscription.status = "active"
        subscription.started_at = datetime.utcnow()
        subscription.expires_at = (
            datetime.utcnow()
            + timedelta(days=plan.duration_days)
        )

    else:

        subscription = BusinessSubscription(
            business_id=business_id,
            plan_id=plan.id,
            status="active",
            started_at=datetime.utcnow(),
            expires_at=datetime.utcnow()
            + timedelta(days=plan.duration_days),
        )

        db.add(subscription)

    db.commit()

    return {
        "message": "Subscription activated successfully",
        "plan": plan.name,
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

    subscription = (
        db.query(BusinessSubscription)
        .filter(
            BusinessSubscription.business_id == user["business_id"]
        )
        .first()
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

    subscription = (
        db.query(BusinessSubscription)
        .filter(
            BusinessSubscription.business_id == user["business_id"]
        )
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=404,
            detail="Subscription not found",
        )

    subscription.status = "cancelled"

    db.commit()

    return {
        "message": "Subscription cancelled successfully"
    }