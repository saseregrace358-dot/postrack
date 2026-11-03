from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    business_name: str
    currency: str
    terms_accepted: bool
    privacy_policy_accepted: bool
        


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    business_name: str
    role: str

    class Config:
        from_attributes = True