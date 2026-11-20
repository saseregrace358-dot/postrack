
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.subscription_plan import SubscriptionPlan
from app.schemas.plan import PlanOut


router = APIRouter(
    prefix="/plans",
    tags=["Plans"]
)


@router.get("", response_model=list[PlanOut])
def get_plans(db: Session = Depends(get_db)):
    return (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.active.is_(True))
        .order_by(SubscriptionPlan.id.asc())
        .all()
    )
