
from datetime import datetime

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
    tags=["Subscriptions"],
)


@router.get("/plans", response_model=list[SubscriptionPlanOut])
def get_plans(db: Session = Depends(get_db)):
    return (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.active.is_(True))
        .order_by(SubscriptionPlan.price.asc())
        .all()
    )


@router.get("/me")
def my_subscription(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = user.get("business_id")

    if not business_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business.",
        )

    subscription = (
        db.query(BusinessSubscription)
        .filter(
            BusinessSubscription.business_id == str(business_id)
        )
        .first()
    )

    if not subscription:
        return {
            "status": "inactive",
            "plan": None,
            "expires_at": None,
        }

    now = datetime.utcnow()

    if (
        subscription.status == "active"
        and subscription.expires_at
        and subscription.expires_at <= now
    ):
        subscription.status = "expired"
        db.commit()
        db.refresh(subscription)

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
        "expires_at": subscription.expires_at,
    }
