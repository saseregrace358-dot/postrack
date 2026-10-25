
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PlanBase(BaseModel):
    name: str
    price: float = Field(ge=0)
    duration_days: int = Field(default=30, ge=1)
    description: str = ""
    max_sales: int = Field(default=1000, ge=-1)
    max_products: int = Field(default=100, ge=-1)
    max_employees: int = Field(default=1, ge=-1)
    max_customers: int = Field(default=100, ge=-1)
    ai_enabled: bool = False
    reports_enabled: bool = False
    export_enabled: bool = False
    notifications_enabled: bool = True


class SubscriptionPlanCreate(PlanBase):
    pass


class SubscriptionPlanUpdate(BaseModel):
    name: str | None = None
    price: float | None = Field(default=None, ge=0)
    duration_days: int | None = Field(default=None, ge=1)
    description: str | None = None
    max_sales: int | None = Field(default=None, ge=-1)
    max_products: int | None = Field(default=None, ge=-1)
    max_employees: int | None = Field(default=None, ge=-1)
    max_customers: int | None = Field(default=None, ge=-1)
    ai_enabled: bool | None = None
    reports_enabled: bool | None = None
    export_enabled: bool | None = None
    notifications_enabled: bool | None = None
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
    started_at: datetime | None = None
    expires_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
