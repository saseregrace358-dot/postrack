from uuid import uuid4
import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.models.subscription_plan import SubscriptionPlan
from app.services.paystack import initialize_payment

router = APIRouter(
    prefix="/public/payments",
    tags=["Public Payments"],
)

class PaymentRequest(BaseModel):
    plan: str
    email: str


@router.post("/initialize")
def initialize_public_payment(
    payload: PaymentRequest,
    db: Session = Depends(get_db),
):

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            func.lower(SubscriptionPlan.name)
            == payload.plan.lower()
        )
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Plan not found",
        )

    reference = str(uuid4())

    response = initialize_payment(
        email=payload.email,
        amount=plan.price,
        reference=reference,
        callback_url=f"{os.getenv('LANDING_URL')}/payment-success",
        business_id="landing",
        plan=plan.name,
    )

    if not response["status"]:
        raise HTTPException(
            status_code=400,
            detail=response["message"],
        )

    return {
        "authorization_url": response["data"]["authorization_url"],
        "reference": reference,
    }