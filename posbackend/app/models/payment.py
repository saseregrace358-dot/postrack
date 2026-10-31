
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    DateTime,
)
from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    business_id = Column(String, index=True, nullable=False)

    plan_id = Column(Integer, nullable=False)

    amount = Column(Float, nullable=False)

    provider = Column(String, nullable=False)

    reference = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    status = Column(String, nullable=False, default="pending")

    # initial = normal subscription purchase
    # renewal = automatic subscription renewal
    payment_type = Column(
        String,
        nullable=False,
        default="initial",
    )

    # Identifies the subscription expiry this renewal is for.
    # Prevents creating multiple renewal attempts for the same period.
    renewal_key = Column(
        String,
        unique=True,
        nullable=True,
    )

    paid_at = Column(DateTime, default=datetime.utcnow, nullable=False)

