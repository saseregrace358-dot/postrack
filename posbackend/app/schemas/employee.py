from pydantic import BaseModel
from typing import Optional


class EmployeeCreate(BaseModel):
    name: str
    age: Optional[str] = ""
    sex: Optional[str] = ""
    email: str
    phone: Optional[str] = ""
    address: Optional[str] = ""
    stateOfOrigin: Optional[str] = ""
    position: Optional[str] = ""
    dateOfEmployment: Optional[str] = ""
    status: Optional[str] = "active"
    performance: Optional[str] = ""
    salaryRange: Optional[str] = ""
    avatar: Optional[str] = ""


class EmployeeUpdate(EmployeeCreate):
    pass


class EmployeeResponse(EmployeeCreate):
    id: int

    class Config:
        from_attributes = True