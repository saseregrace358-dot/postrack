from pydantic import BaseModel
from typing import List, Optional

class EmployeeCreate(BaseModel):
    name: str
    password: str
    permissions: List[str]

class EmployeeUpdate(BaseModel):
    name: str
    password: Optional[str] = None
    permissions: List[str]
   
class EmployeeResponse(BaseModel):
    id: int
    name: str
    permissions: List[str]

class EmployeeLogin(BaseModel):
    name: str
    password: str

    class Config:
        from_attributes = True

