from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.email_service import send_welcome_email
from app.auth.jwt import decode_token, create_access_token
from app.auth.password import hash_password, verify_password
from app.database import get_db
from app.models.user import User
from app.utils.business_id import generate_business_id
from pydantic import BaseModel, EmailStr
from app.auth.dependencies import get_current_user
from app.utils.email_service import send_reset_email
from datetime import datetime, timedelta

from app.models.subscription_plan import SubscriptionPlan
from app.models.business_subscription import BusinessSubscription
import socket
import random
import traceback
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

class VerifyResetCodeRequest(BaseModel):
    email: str
    code: str


class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

# =====================
# REGISTER
# =====================
@router.post("/register")
async def register(user: UserRegister, db: Session = Depends(get_db)):

    existing = db.query(User).filter(User.email == user.email).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )

    hashed = hash_password(user.password)

    business_id = generate_business_id(user.business_name)

    new_user = User(
        name=user.name,
        email=user.email,
        password=hashed,
        business_name=user.business_name,
        business_id=business_id,
        role="owner"
    )

    print("========== REGISTER ==========")

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    await send_welcome_email(
    user.email,
    user.name,
    user.business_name
)
    print("User saved:", new_user.business_id)

    free_plan = (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.name == "Free")
        .first()
    )

    print("Free plan found:", free_plan)

    subscription = BusinessSubscription(
        business_id=new_user.business_id,
        plan_id=free_plan.id,
        status="active",
        started_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=36500)
    )

    print("Subscription object created")

    db.add(subscription)

    print("About to commit subscription")

    db.commit()

    print("Subscription committed!")
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

# ==========================================
# FORGOT PASSWORD
# ==========================================
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

    print("Step 1: User found")

    # Generate verification code
    code = str(random.randint(100000, 999999))
    print("Step 2: Code generated:", code)

    user.reset_code = code
    user.reset_code_expires = (
        datetime.utcnow() + timedelta(minutes=10)
    )

    db.commit()
    print("Step 3: Database committed")

    try:
        print("Step 4: Sending email...")
        await send_reset_email(user.email, code)
        print("Step 5: Email sent")

        return {
            "message": "Verification code sent successfully."
        }

    except Exception as e:
        print("Step 6: Error sending email")
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to send verification code: {str(e)}"
        )
# ==========================================
# VERIFY RESET CODE
# ==========================================
@router.post("/verify-reset-code")
def verify_reset_code(
    payload: VerifyResetCodeRequest,
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

    if user.reset_code != payload.code:
        raise HTTPException(
            status_code=400,
            detail="Invalid verification code"
        )

    if (
        user.reset_code_expires is None
        or datetime.utcnow() > user.reset_code_expires
    ):
        raise HTTPException(
            status_code=400,
            detail="Verification code has expired"
        )

    return {
        "message": "Verification successful"
    }


# ==========================================
# RESET PASSWORD
# ==========================================
@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
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

    if user.reset_code != payload.code:
        raise HTTPException(
            status_code=400,
            detail="Invalid verification code"
        )

    if (
        user.reset_code_expires is None
        or datetime.utcnow() > user.reset_code_expires
    ):
        raise HTTPException(
            status_code=400,
            detail="Verification code has expired"
        )

    user.password = hash_password(
        payload.new_password
    )

    # Clear verification code after successful reset
    user.reset_code = None
    user.reset_code_expires = None

    db.commit()

    return {
        "message": "Password successfully updated"
    }


