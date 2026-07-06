from pydantic import BaseModel


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


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
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


class PlanOut(PlanBase):
    id: int
    active: bool

    class Config:
        from_attributes = True