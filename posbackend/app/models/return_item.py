from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from datetime import datetime
from app.database import Base


class ReturnItem(Base):
    __tablename__ = "return_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    return_id = Column(
        Integer,
        ForeignKey("return_records.id"),
        nullable=False,
        index=True
    )

    product_id = Column(Integer, nullable=False, index=True)
    product_name = Column(String, nullable=False)

    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    refund_amount = Column(Float, nullable=False)

    item_condition = Column(String, nullable=False, default="Resellable")
    restocked = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)