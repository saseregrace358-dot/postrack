# models/inventory_log.py
from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database import Base

class InventoryLog(Base):
    __tablename__ = "inventory_logs"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer)
    change_type = Column(String)  # sold, restocked
    quantity = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow)