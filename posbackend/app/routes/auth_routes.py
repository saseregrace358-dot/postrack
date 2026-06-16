from fastapi import APIRouter
from app.auth import create_access_token
from app.database import cursor, conn

router = APIRouter()

@router.post("/login")
def login(username: str, password: str):

    cursor.execute(
        "SELECT id, password FROM users WHERE username=%s",
        (username,)
    )
    user = cursor.fetchone()

    if not user:
        return {"error": "Invalid credentials"}

    user_id, db_password = user

    # (we will improve password hashing next step)
    if password != db_password:
        return {"error": "Invalid credentials"}

    token = create_access_token({"user_id": user_id})

    return {"access_token": token}