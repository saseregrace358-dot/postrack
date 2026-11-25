
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Literal


class EmployeeCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: str = "Employee"
    status: Literal["active", "inactive"] = "active"
    permissions: List[str] = Field(default_factory=list)


class EmployeeUpdate(BaseModel):
    full_name: str
    email: str
    password: Optional[str] = None
    role: str = "Employee"
    status: Literal["active", "inactive"] = "active"
    permissions: List[str] = Field(default_factory=list)


class EmployeeResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    status: str
    permissions: List[str]

    model_config = ConfigDict(from_attributes=True)


class EmployeeLogin(BaseModel):
    email: str
    password: str
