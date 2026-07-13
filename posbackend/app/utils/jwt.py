# app/utils/jwt.py
from datetime import datetime, timedelta
import jwt

import os

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 2

def create_access_token(data: dict):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=2)
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")