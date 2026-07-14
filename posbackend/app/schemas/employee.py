from pydantic import BaseModel
from typing import List, Optional

class EmployeeCreate(BaseModel):
    full_name: str
    email: str
    password: str
    permissions: List[str]

class EmployeeUpdate(BaseModel):
    full_name: str
    email: str
    password: Optional[str] = None
    permissions: List[str]
   
class EmployeeResponse(BaseModel):
    id: int
    full_name: str
    email: str
    permissions: List[str]

class EmployeeLogin(BaseModel):
    full_name: str
    email: str
    password: str

    class Config:
        from_attributes = True

