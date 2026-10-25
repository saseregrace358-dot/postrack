
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

    # Only set this after successful payment verification.
    paid_at = Column(DateTime, nullable=True, default=None)
