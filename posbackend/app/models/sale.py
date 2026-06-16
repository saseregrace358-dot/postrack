from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from datetime import datetime
from app.database import Base

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, autoincrement=True)

    date = Column(DateTime, default=datetime.utcnow)

    items = Column(JSON)  # [{product_id, qty, price}]

    subtotal = Column(Float)
    tax = Column(Float)
    total = Column(Float)

    amountPaid = Column(Float, default=0)
    balance = Column(Float, default=0)

    paymentMethod = Column(String)
    payments = Column(JSON, default=[])

    status = Column(String, default="UNPAID")  # PAID, DEBT