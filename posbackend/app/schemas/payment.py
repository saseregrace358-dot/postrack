
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PaymentRequest(BaseModel):
    plan_name: str
    billing_interval: Literal["monthly", "yearly"] = "monthly"
    payment_currency: Literal["NGN", "USD"] = "NGN"


class PaymentCreate(BaseModel):
    business_id: str
    plan_id: int
    amount: Decimal = Field(ge=0)
    provider: str
    reference: str
    status: str = "pending"

    payment_type: Literal["initial", "renewal"] = "initial"
    billing_interval: Literal["monthly", "yearly"] = "monthly"
    payment_currency: Literal["NGN", "USD"] = "NGN"

    renewal_key: str | None = None


class PaymentOut(BaseModel):
    id: int
    business_id: str
    plan_id: int
    amount: Decimal
    provider: str
    reference: str
    status: str

    payment_type: Literal["initial", "renewal"] = "initial"
    billing_interval: Literal["monthly", "yearly"] = "monthly"
    payment_currency: Literal["NGN", "USD"] = "NGN"

    renewal_key: str | None = None
    paid_at: datetime

    model_config = ConfigDict(from_attributes=True)
