
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PlanBase(BaseModel):
    name: str

    # Legacy monthly NGN price.
    price: float = Field(default=0, ge=0)

    # Monthly pricing
    monthly_price_ngn: float = Field(default=0, ge=0)
    monthly_price_usd: float = Field(default=0, ge=0)

    # Annual pricing
    yearly_price_ngn: float = Field(default=0, ge=0)
    yearly_price_usd: float = Field(default=0, ge=0)

    # Subscription duration
    duration_value: int = Field(default=1, ge=1)
    duration_unit: Literal["days", "months", "years"] = "months"

    description: str = ""

    # Plan limits (-1 means unlimited)
    max_sales: int = -1
    max_products: int = -1
    max_employees: int = -1
    max_customers: int = -1

    # Features
    ai_enabled: bool = False
    reports_enabled: bool = False
    export_enabled: bool = False
    notifications_enabled: bool = True

    custom_pricing: bool = False


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    name: str | None = None

    price: float | None = Field(default=None, ge=0)

    monthly_price_ngn: float | None = Field(default=None, ge=0)
    monthly_price_usd: float | None = Field(default=None, ge=0)

    yearly_price_ngn: float | None = Field(default=None, ge=0)
    yearly_price_usd: float | None = Field(default=None, ge=0)

    duration_value: int | None = Field(default=None, ge=1)
    duration_unit: Literal["days", "months", "years"] | None = None

    description: str | None = None

    max_sales: int | None = None
    max_products: int | None = None
    max_employees: int | None = None
    max_customers: int | None = None

    ai_enabled: bool | None = None
    reports_enabled: bool | None = None
    export_enabled: bool | None = None
    notifications_enabled: bool | None = None

    custom_pricing: bool | None = None
    active: bool | None = None


class PlanOut(PlanBase):
    id: int
    active: bool

    model_config = ConfigDict(from_attributes=True)
