from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user

from app.models.subscription_plan import SubscriptionPlan
from app.models.business_subscription import BusinessSubscription

from app.schemas.subscription import (
    SubscriptionPlanOut,
    BusinessSubscriptionOut,
)

router = APIRouter(
    prefix="/subscriptions",
    tags=["Subscriptions"]
)


# ==========================
# GET ALL PLANS
# ==========================
@router.get("/plans", response_model=list[SubscriptionPlanOut])
def get_plans(db: Session = Depends(get_db)):
    return db.query(SubscriptionPlan).all()


# ==========================
# GET CURRENT SUBSCRIPTION
# ==========================
@router.get("/me", response_model=BusinessSubscriptionOut)
def my_subscription(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
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
            detail="No subscription found"
        )

    return subscription


# ==========================
# CHANGE PLAN
# ==========================
@router.post("/change/{plan_id}")
def change_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    plan = (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.id == plan_id)
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Plan not found"
        )

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
            detail="Subscription not found"
        )

    subscription.plan_id = plan.id
    subscription.started_at = datetime.utcnow()
    subscription.expires_at = (
        datetime.utcnow() +
        timedelta(days=plan.duration_days)
    )
    subscription.status = "active"

    db.commit()

    return {
        "message": "Subscription updated successfully"
    }