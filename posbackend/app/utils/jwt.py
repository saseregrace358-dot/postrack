# app/utils/jwt.py
from datetime import datetime, timedelta
import jwt

SECRET_KEY = "your-secret"

def create_access_token(data: dict):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=2)
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")