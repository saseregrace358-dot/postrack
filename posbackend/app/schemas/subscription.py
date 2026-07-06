from datetime import datetime
from pydantic import BaseModel


# ==========================
# Subscription Plans
# ==========================

class PlanBase(BaseModel):
    name: str
    price: float
    duration_days: int = 30

    max_products: int
    max_employees: int
    max_customers: int

    ai_enabled: bool = False
    reports_enabled: bool = False
    notifications_enabled: bool = True


class SubscriptionPlanCreate(PlanBase):
    pass


class SubscriptionPlanUpdate(BaseModel):
    name: str | None = None
    price: float | None = None
    duration_days: int | None = None

    max_products: int | None = None
    max_employees: int | None = None
    max_customers: int | None = None

    ai_enabled: bool | None = None
    reports_enabled: bool | None = None
    notifications_enabled: bool | None = None

    active: bool | None = None


class SubscriptionPlanOut(PlanBase):
    id: int
    active: bool

    class Config:
        from_attributes = True


# ==========================
# Business Subscription
# ==========================

class BusinessSubscriptionOut(BaseModel):
    id: int

    business_id: str

    plan_id: int

    status: str

    started_at: datetime | None = None

    expires_at: datetime | None = None

    class Config:
        from_attributes = True