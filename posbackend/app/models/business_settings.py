from sqlalchemy import Column, Integer, String, Boolean, Float
from app.database import Base


class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id = Column(Integer, primary_key=True, index=True)

    business_id = Column(String, unique=True, index=True)

    tax_enabled = Column(Boolean, default=False)

    tax_rate = Column(Float, default=0)

    debt_threshold = Column(Float, default=0)