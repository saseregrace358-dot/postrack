from sqlalchemy import Column, Integer, String, JSON
from app.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String, nullable=False)

    permissions = Column(JSON, default=[])

    business_id = Column(String, nullable=False)

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