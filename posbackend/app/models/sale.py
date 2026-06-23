from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from datetime import datetime
from app.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String, unique=True, index=True)

    date = Column(DateTime, default=datetime.utcnow)

    items = Column(JSON)

    subtotal = Column(Float)
    tax = Column(Float)
    total = Column(Float)

    amountPaid = Column(Float,)
    balance = Column(Float, default=0)

    paymentMethod = Column(String)
    payments = Column(JSON, default=[])

    status = Column(String, default="UNPAID")

    # 🔥 MULTI-TENANT FIELDS
    business_id = Column(String, index=True)
    created_by = Column(Integer)
    created_by_name = Column(String)