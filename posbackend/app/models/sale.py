
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    JSON,
    Numeric,
)
from sqlalchemy.ext.mutable import MutableList
from datetime import datetime

from app.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String, unique=True, index=True)

    date = Column(DateTime, default=datetime.utcnow)

    items = Column(MutableList.as_mutable(JSON))

    subtotal = Column(Float)
    tax = Column(Float)
    total = Column(Float)

    amountPaid = Column(Float, default=0)
    balance = Column(Float, default=0)

    paymentMethod = Column(String)

    payments = Column(
        MutableList.as_mutable(JSON),
        default=list
    )

    status = Column(String, default="UNPAID")

    # Historical currency information
    base_currency = Column(String(3), nullable=False, default="NGN")
    currency_at_sale = Column(String(3), nullable=False, default="NGN")

    exchange_rate_at_sale = Column(
        Numeric(20, 10),
        nullable=False,
        default=1
    )

    original_amounts = Column(JSON, nullable=True)

    # Multi-tenant fields
    business_id = Column(String, index=True)
    created_by = Column(Integer)
    created_by_name = Column(String)
