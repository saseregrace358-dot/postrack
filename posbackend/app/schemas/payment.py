from datetime import datetime
from pydantic import BaseModel


class PaymentRequest(BaseModel):
    plan: str


class PaymentCreate(BaseModel):
    business_id: str
    plan_id: int
    amount: float
    provider: str
    reference: str
    status: str


class PaymentOut(BaseModel):
    id: int
    business_id: str
    plan_id: int
    amount: float
    provider: str
    reference: str
    status: str
    paid_at: datetime

    class Config:
        from_attributes = True