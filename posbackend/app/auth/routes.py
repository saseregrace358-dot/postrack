from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth.jwt import decode_token, create_access_token
from app.auth.password import hash_password, verify_password
from app.database import get_db
from app.models.user import User
from app.utils.business_id import generate_business_id

router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer(auto_error=True)

# =====================
# SCHEMAS
# =====================

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    business_name: str


class UserLogin(BaseModel):
    email: str
    password: str


# =====================
# REGISTER
# =====================
@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):

    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed = hash_password(user.password)

    business_id = generate_business_id(user.business_name)

    new_user = User(
        name=user.name,
        email=user.email,
        password=hashed,
        business_name=user.business_name,
        business_id=business_id,
        role="owner"   # default role assigned server-side
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User created successfully",
        "business_id": business_id
    }


# =====================
# LOGIN
# =====================
@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):

    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    token = create_access_token({
    "sub": db_user.email,
    "business_id": db_user.business_id,
    "role": db_user.role,
    "user_id": db_user.id,
    "name": db_user.name
})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "name": db_user.name,
            "email": db_user.email,
            "business_id": db_user.business_id,
            "role": db_user.role
        }
    }


# =====================
# ME
# =====================
@router.get("/me")
def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):

    try:
        token = credentials.credentials
        payload = decode_token(token)

        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "business_id": user.business_id,
        "role": user.role
    }