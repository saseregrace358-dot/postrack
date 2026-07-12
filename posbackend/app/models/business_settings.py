from sqlalchemy import Column, Integer, String, Boolean, Float
from app.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime

class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id = Column(Integer, primary_key=True, index=True)

    business_id = Column(String, unique=True, index=True)

    tax_enabled = Column(Boolean, default=False)

    tax_rate = Column(Float, default=0)

    debt_threshold = Column(Float, default=0)

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