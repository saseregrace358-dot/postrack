
from datetime import datetime, timezone

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


@router.get(
    "/plans",
    response_model=list[SubscriptionPlanOut],
)
def get_plans(db: Session = Depends(get_db)):
    return (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.active.is_(True))
        .order_by(SubscriptionPlan.monthly_price_ngn.asc())
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
            "plan_name": None,
            "plan": None,
            "expires_at": None,
            "billing_interval": None,
            "payment_currency": None,
            "amount_paid": None,
        }

    # Update expired statuses without blocking subscription viewing.
    if subscription.expires_at is not None:
        expiry = subscription.expires_at

        if expiry.tzinfo is not None:
            now = datetime.now(timezone.utc)
        else:
            now = datetime.utcnow()

        if (
            subscription.status in ("active", "cancelled", "trialing")
            and expiry <= now
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
        "id": subscription.id,
        "business_id": subscription.business_id,
        "plan_id": subscription.plan_id,
        "status": subscription.status,
        "plan_name": plan.name if plan else None,
        "plan": plan,
        "expires_at": subscription.expires_at,
        "started_at": subscription.started_at,
        "billing_interval": subscription.billing_interval,
        "payment_currency": subscription.payment_currency,
        "amount_paid": subscription.amount_paid,
    }
