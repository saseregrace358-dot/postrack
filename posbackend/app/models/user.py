from sqlalchemy import Column, Integer, String
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)

    role = Column(String, default="Admin")

    business_id = Column(String, unique=True, index=True)
    business_name = Column(String, unique=True, index=True)
    reset_token = Column(String, nullable=True)