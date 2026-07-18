from fastapi import WebSocket


class ConnectionManager:

    def __init__(self):
        # { business_id: [websocket, websocket] }
        self.connections: dict[str, list[WebSocket]] = {}

    async def connect(
        self,
        business_id: str,
        websocket: WebSocket
    ):
        await websocket.accept()

        if business_id not in self.connections:
            self.connections[business_id] = []

        self.connections[business_id].append(websocket)

    def disconnect(
        self,
        business_id: str,
        websocket: WebSocket
    ):
        if business_id not in self.connections:
            return

        if websocket in self.connections[business_id]:
            self.connections[business_id].remove(websocket)

        if not self.connections[business_id]:
            del self.connections[business_id]

    async def broadcast(
        self,
        business_id: str,
        data: dict
    ):
        if business_id not in self.connections:
            return

        dead = []

        for connection in self.connections[business_id]:
            try:
                await connection.send_json(data)
            except Exception:
                dead.append(connection)

        for connection in dead:
            self.disconnect(business_id, connection)


manager = ConnectionManager()