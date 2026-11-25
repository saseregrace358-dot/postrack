
from sqlalchemy import Column, Integer, String, JSON, DateTime
from datetime import datetime

from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)

    # Employee phone number
    phone = Column(String(30), nullable=True)

    # Employee job role
    role = Column(
        String(50),
        nullable=False,
        default="Employee",
    )

    # Account status: active or inactive
    status = Column(
        String(20),
        nullable=False,
        default="active",
    )

    permissions = Column(JSON, default=list)

    business_id = Column(String, nullable=False)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
