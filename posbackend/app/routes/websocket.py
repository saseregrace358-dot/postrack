import os

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.websocket_manager import manager
from app.services.subscription_service import (
    get_valid_subscription,
    check_subscription_feature,
    check_creation_limit,
)

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"


@router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    token = websocket.query_params.get("token")

    if not token or not SECRET_KEY:
        await websocket.close(code=1008)
        return

    db: Session = SessionLocal()
    connected = False
    business_id = None

    try:
        # Authenticate the WebSocket connection.
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        business_id = payload.get("business_id")

        if not business_id:
            await websocket.close(code=1008)
            return

        # Require an active subscription with notifications enabled.
        check_subscription_feature(
            db,
            business_id,
            "notifications",
        )

        # Connect only after authentication and subscription checks pass.
        await manager.connect(business_id, websocket)
        connected = True

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        pass

    except JWTError:
        await websocket.close(code=1008)

    except Exception:
        await websocket.close(code=1008)

    finally:
        if connected:
            manager.disconnect(business_id, websocket)

        db.close()