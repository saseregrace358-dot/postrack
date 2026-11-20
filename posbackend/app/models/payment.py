
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    Numeric,
    String,
    DateTime,
)

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    business_id = Column(
        String,
        index=True,
        nullable=False,
    )

    plan_id = Column(
        Integer,
        nullable=False,
    )

    amount = Column(
        Numeric(12, 2),
        nullable=False,
    )

    provider = Column(
        String,
        nullable=False,
    )

    reference = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    status = Column(
        String,
        nullable=False,
        default="pending",
    )

    # initial = normal subscription purchase
    # renewal = subscription renewal
    payment_type = Column(
        String,
        nullable=False,
        default="initial",
    )

    # Nullable for historical payments where this was not recorded.
    billing_interval = Column(
        String,
        nullable=True,
    )

    # Actual currency charged by the payment provider.
    # New payments must explicitly provide this value.
    payment_currency = Column(
        String(3),
        nullable=True,
    )

    renewal_key = Column(
        String,
        unique=True,
        nullable=True,
    )

    paid_at = Column(
        DateTime,
        nullable=True,
    )
