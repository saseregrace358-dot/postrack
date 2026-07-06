from sqlalchemy import Column, Integer, Float, String, DateTime
from app.database import Base
from datetime import datetime


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    business_id = Column(String, index=True)

    plan_id = Column(Integer)

    amount = Column(Float)

    provider = Column(String)

    reference = Column(String)

    status = Column(String)

    paid_at = Column(DateTime, default=datetime.utcnow)

    