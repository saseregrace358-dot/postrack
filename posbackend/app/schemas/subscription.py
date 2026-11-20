
from datetime import datetime
from typing import Literal
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class PlanBase(BaseModel):
    name: str
    price: float = Field(default=0, ge=0)

    # Monthly pricing
    monthly_price_ngn: float = Field(default=0, ge=0)
    monthly_price_usd: float = Field(default=0, ge=0)

    # Annual pricing (total amount billed for the year)
    yearly_price_ngn: float = Field(default=0, ge=0)
    yearly_price_usd: float = Field(default=0, ge=0)

    # Subscription duration
    duration_value: int = Field(default=1, ge=1)
    duration_unit: Literal["days", "months", "years"] = "months"

    description: str = ""

    # Limits (-1 means unlimited)
    max_sales: int = Field(default=-1, ge=-1)
    max_products: int = Field(default=100, ge=-1)
    max_employees: int = Field(default=1, ge=-1)
    max_customers: int = Field(default=-1, ge=-1)

    # Features
    ai_enabled: bool = False
    reports_enabled: bool = False
    export_enabled: bool = False
    notifications_enabled: bool = True

    # Custom pricing for Enterprise
    custom_pricing: bool = False


class SubscriptionPlanCreate(PlanBase):
    pass


class SubscriptionPlanUpdate(BaseModel):
    name: str | None = None
    price: float | None = Field(default=None, ge=0)

    monthly_price_ngn: float | None = Field(default=None, ge=0)
    monthly_price_usd: float | None = Field(default=None, ge=0)

    yearly_price_ngn: float | None = Field(default=None, ge=0)
    yearly_price_usd: float | None = Field(default=None, ge=0)

    duration_value: int | None = Field(default=None, ge=1)
    duration_unit: Literal["days", "months", "years"] | None = None

    description: str | None = None

    max_sales: int | None = Field(default=None, ge=-1)
    max_products: int | None = Field(default=None, ge=-1)
    max_employees: int | None = Field(default=None, ge=-1)
    max_customers: int | None = Field(default=None, ge=-1)

    ai_enabled: bool | None = None
    reports_enabled: bool | None = None
    export_enabled: bool | None = None
    notifications_enabled: bool | None = None

    custom_pricing: bool | None = None
    active: bool | None = None


class SubscriptionPlanOut(PlanBase):
    id: int
    active: bool

    model_config = ConfigDict(from_attributes=True)


class BusinessSubscriptionOut(BaseModel):
    id: int
    business_id: str
    plan_id: int
    status: str
    billing_interval: str = "monthly"
    payment_currency: str = "NGN"
    amount_paid: Decimal = Decimal("0.00")

    started_at: datetime | None = None
    expires_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
