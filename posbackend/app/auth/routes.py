from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.auth.password import hash_password, verify_password
from app.auth.jwt import create_access_token
from app.auth.auth import fake_users_db

router = APIRouter(prefix="/auth", tags=["Auth"])


class UserRegister(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


# REGISTER
@router.post("/register")
def register(user: UserRegister):
    if user.email in fake_users_db:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed = hash_password(user.password)

    fake_users_db[user.email] = {
        "name": user.name,
        "email": user.email,
        "password": hashed,
    }

    return {"message": "User created successfully"}


# LOGIN
@router.post("/login")
def login(user: UserLogin):
    db_user = fake_users_db.get(user.email)

    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_access_token({"sub": user.email})

    return {
        "access_token": token,
        "token_type": "bearer"
    }