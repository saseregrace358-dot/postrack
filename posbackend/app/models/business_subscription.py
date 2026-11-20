
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Numeric,
)
from sqlalchemy.orm import relationship

from app.database import Base


class BusinessSubscription(Base):
    __tablename__ = "business_subscriptions"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    business_id = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    plan_id = Column(
        Integer,
        ForeignKey("subscription_plans.id"),
        nullable=False,
    )

    status = Column(
        String,
        default="active",
        nullable=False,
    )

    billing_interval = Column(
        String,
        default="monthly",
        nullable=False,
    )

    # Actual currency used for the subscription payment.
    # Null is allowed for trials and legacy records without
    # a verified payment currency.
    payment_currency = Column(
        String(3),
        nullable=True,
    )

    amount_paid = Column(
        Numeric(12, 2),
        default=Decimal("0.00"),
        nullable=False,
    )

    plan = relationship(
        "SubscriptionPlan",
    )

    started_at = Column(
        DateTime,
        nullable=True,
    )

    expires_at = Column(
        DateTime,
        nullable=True,
    )
