from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from posbackend.app.models.subscription_plan import Plan
from app.schemas.plan import PlanCreate, PlanOut

router = APIRouter(
    prefix="/plans",
    tags=["Plans"]
)


@router.get("", response_model=list[PlanOut])
def get_plans(db: Session = Depends(get_db)):
    return db.query(Plan).all()


@router.post("", response_model=PlanOut)
def create_plan(
    plan: PlanCreate,
    db: Session = Depends(get_db)
):
    new_plan = Plan(**plan.model_dump())

    db.add(new_plan)

    db.commit()

    db.refresh(new_plan)

    return new_plan