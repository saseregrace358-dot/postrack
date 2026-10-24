from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
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

    refund_amount = Column(Float, nullable=False, default=0.0)

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

    # Link the return record to its returned items.
    items = relationship(
        "ReturnItem",
        back_populates="return_record",
        cascade="all, delete-orphan",
        lazy="selectin",
    )