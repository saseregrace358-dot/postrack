from sqlalchemy import Column, Integer, String, JSON
from app.database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)
    password = Column(String, nullable=False)

    permissions = Column(JSON, default=[])

    business_id = Column(String, nullable=False)