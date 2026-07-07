from sqlalchemy import Column, Integer, Float, String, Boolean
from app.database import Base


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, unique=True)

    price = Column(Float)

    duration_days = Column(Integer, default=30)

    description = Column(String)

    max_products = Column(Integer)

    max_employees = Column(Integer)

    max_customers = Column(Integer)

    ai_enabled = Column(Boolean, default=False)

    reports_enabled = Column(Boolean, default=False)
    Export_enable = Column(Boolean, default=False)

    notifications_enabled = Column(Boolean, default=True)

    active = Column(Boolean, default=True)