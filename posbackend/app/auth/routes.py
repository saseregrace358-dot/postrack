from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth.jwt import decode_token, create_access_token
from app.auth.password import hash_password, verify_password
from app.database import get_db
from app.models.user import User
from app.utils.business_id import generate_business_id
from pydantic import BaseModel, EmailStr
from app.auth.dependencies import get_current_user
from app.utils.mail_sender import send_reset_email

import secrets

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

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

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

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

@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == payload.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Email not found"
        )

    token = secrets.token_urlsafe(32)

    user.reset_token = token
    db.commit()

    try:
        await send_reset_email(user.email, token)

        return {
            "message": "Reset email sent."
        }

    except Exception as e:
        print(e)   # Optional: log the real error

        raise HTTPException(
            status_code=500,
            detail="Failed to send reset email."
        )

@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.reset_token == payload.token
    ).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired token"
        )

    user.password = hash_password(
        payload.new_password
    )

    user.reset_token = None

    db.commit()

    return {
        "message":"Password successfully updated"
    }