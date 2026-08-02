from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import jwt, JWTError
from app.websocket_manager import manager
import os

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"


@router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    token = websocket.query_params.get("token")

    if not token:
        print("No token received")
        await websocket.close(code=1008)
        return

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        print("JWT Payload:", payload)

        business_id = payload["business_id"]

        await manager.connect(business_id, websocket)
        print("WebSocket connected")

        while True:
            await websocket.receive_text()

    except JWTError as e:
        print("JWT ERROR:", e)
        await websocket.close(code=1008)

    except Exception as e:
        print("GENERAL ERROR:", repr(e))
        await websocket.close(code=1008)