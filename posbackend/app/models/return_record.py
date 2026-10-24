from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.database import Base


class ReturnRecord(Base):
    __tablename__ = "return_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False, index=True)
    order_id = Column(String, nullable=False, index=True)

    business_id = Column(String, nullable=False, index=True)
    reason = Column(String, nullable=False)

    refund_amount = Column(Float, nullable=False, default=0)
    refund_status = Column(String, nullable=False, default="PENDING")

    created_by = Column(Integer)
    created_by_name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)