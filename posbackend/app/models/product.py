from sqlalchemy import Column, Integer, String, DateTime, Float
from datetime import datetime
from app.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)

    cost = Column(Float, nullable=False)   # ✅ ADD THIS
    price = Column(Float, nullable=False)

    category = Column(String)
    stock = Column(Integer, default=0)
    image = Column(String, nullable=True)
    barcode = Column(String, nullable=True)  # ✅ ADD THIS

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    