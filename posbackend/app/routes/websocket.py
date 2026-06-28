from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket_manager import manager

router = APIRouter()

@router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)