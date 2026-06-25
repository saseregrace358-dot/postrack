from sqlalchemy import Column, Integer, String
from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)
    age = Column(String)
    sex = Column(String)

    email = Column(String, unique=True, nullable=False)
    phone = Column(String)

    address = Column(String)
    state_of_origin = Column(String)

    position = Column(String)

    date_of_employment = Column(String)

    status = Column(String, default="active")

    performance = Column(String)

    salary_range = Column(String)

    avatar = Column(String)

    business_id = Column(String, nullable=False)