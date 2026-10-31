from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from app.database import Base


class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)

    business_id = Column(
        String,
        index=True,
        nullable=False,
    )

    authorization_code = Column(
        String,
        nullable=False,
    )

    authorization_signature = Column(
        String,
        nullable=True,
    )

    customer_email = Column(
        String,
        nullable=False,
    )

    card_type = Column(String, nullable=True)

    last4 = Column(String, nullable=True)

    exp_month = Column(String, nullable=True)

    exp_year = Column(String, nullable=True)

    reusable = Column(Boolean, default=False)

    active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

