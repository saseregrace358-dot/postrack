from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.connections:
            self.connections.remove(websocket)

    async def broadcast(self, data: dict):
        dead = []

        for connection in self.connections:
            try:
                await connection.send_json(data)
            except:
                dead.append(connection)

        for connection in dead:
            self.disconnect(connection)


manager = ConnectionManager()