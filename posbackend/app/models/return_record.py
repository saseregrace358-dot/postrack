from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Numeric,
    JSON,
)
from sqlalchemy.orm import relationship

from app.database import Base


class ReturnRecord(Base):
    __tablename__ = "return_records"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )

    sale_id = Column(
        Integer,
        ForeignKey("sales.id"),
        nullable=False,
        index=True,
    )

    order_id = Column(String, nullable=False, index=True)
    business_id = Column(String, nullable=False, index=True)
    reason = Column(String, nullable=False)

    # Stored in the business's base currency.
    refund_amount = Column(Float, nullable=False, default=0.0)

    # Currency history for this return.
    base_currency = Column(String(3), nullable=False, default="NGN")

    currency_at_return = Column(
        String(3),
        nullable=False,
        default="NGN",
    )

    exchange_rate_at_return = Column(
        Numeric(20, 10),
        nullable=False,
        default=1,
    )

    # Original refund amounts in the currency used when the return
    # was recorded, including item-level amounts.
    original_amounts = Column(JSON, nullable=True)

    refund_status = Column(
        String,
        nullable=False,
        default="PENDING",
        server_default="PENDING",
    )

    created_by = Column(Integer, nullable=True)
    created_by_name = Column(String, nullable=True)

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    items = relationship(
        "ReturnItem",
        back_populates="return_record",
        cascade="all, delete-orphan",
        lazy="selectin",
    )