
from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    Boolean,
)
from app.database import Base


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(
        String,
        unique=True,
        nullable=False,
    )

    # Legacy price field.
    # Retained for compatibility with existing code.
    # Represents the monthly NGN price.
    price = Column(
        Float,
        default=0,
        nullable=False,
    )

    # Monthly pricing
    monthly_price_ngn = Column(
        Float,
        default=0,
        nullable=False,
    )

    monthly_price_usd = Column(
        Float,
        default=0,
        nullable=False,
    )

    # Annual pricing (full 12-month amount)
    yearly_price_ngn = Column(
        Float,
        default=0,
        nullable=False,
    )

    yearly_price_usd = Column(
        Float,
        default=0,
        nullable=False,
    )

    # Subscription duration
    duration_value = Column(
        Integer,
        default=1,
        nullable=False,
    )

    duration_unit = Column(
        String,
        default="months",
        nullable=False,
    )

    description = Column(
        String,
        nullable=True,
    )

    # Plan limits
    # Existing high sales limit retained for compatibility.
    max_sales = Column(
        Integer,
        default=999999,
        nullable=False,
    )

    max_products = Column(
        Integer,
        default=100,
        nullable=False,
    )

    max_employees = Column(
        Integer,
        default=1,
        nullable=False,
    )

    max_customers = Column(
        Integer,
        default=-1,
        nullable=False,
    )

    # Plan features
    ai_enabled = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    reports_enabled = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    # Preserve the existing database column name.
    export_enabled = Column(
        "Export_enable",
        Boolean,
        default=False,
        nullable=False,
    )

    notifications_enabled = Column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Enterprise uses custom quotation instead of public checkout.
    custom_pricing = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    active = Column(
        Boolean,
        default=True,
        nullable=False,
    )
