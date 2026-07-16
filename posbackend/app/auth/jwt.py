from datetime import datetime, timedelta
from jose import jwt, JWTError, ExpiredSignatureError
from fastapi import HTTPException, status
import os
from dotenv import load_dotenv

load_dotenv()



SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

def get_secret():
    secret = os.environ.get("SECRET_KEY")
    if not secret:
        raise RuntimeError("SECRET_KEY missing in environment variables")
    return secret

def create_access_token(data: dict, expires_delta: timedelta = None):
    if "sub" not in data:
        raise ValueError("Token must include 'sub'")

    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    secret = get_secret()

    return jwt.encode(to_encode, secret, algorithm=ALGORITHM)

def decode_token(token: str):
    try:
        secret = get_secret()

        payload = jwt.decode(
            token,
            secret,
            algorithms=[ALGORITHM]
        )

        return payload

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
  
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )