
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Float,
    DateTime,
    Numeric
)
from app.database import Base
from datetime import datetime


class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id = Column(Integer, primary_key=True, index=True)

    business_id = Column(String, unique=True, index=True)

    # Tax settings
    tax_enabled = Column(Boolean, default=False)
    tax_rate = Column(Float, default=0)
    debt_threshold = Column(Float, default=0)

    # Currency settings
    # Original currency selected during registration
    base_currency = Column(
        String(3),
        default="NGN",
        nullable=False
    )

    # Currency currently selected by the business owner
    currency = Column(
        String(3),
        default="NGN",
        nullable=False
    )

    # Conversion rate: base currency to active currency
    exchange_rate = Column(
        Numeric(20, 10),
        default=1,
        nullable=False
    )

    exchange_rate_updated_at = Column(
        DateTime,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
