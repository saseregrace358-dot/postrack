from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)

    role = Column(String, default="Admin")

    business_id = Column(String, unique=True, index=True)
    business_name = Column(String, unique=True, index=True)

    reset_code = Column(String, nullable=True)
    reset_code_expires = Column(DateTime, nullable=True)

    # Automatically set when the user is created
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Automatically updated whenever the record changes
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )