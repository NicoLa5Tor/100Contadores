from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.add(ws)

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws)

    async def broadcast(self, payload: dict):
        dead = []
        for ws in list(self.active):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    # Lazy import to avoid circular
    from routers.game import build_state_payload
    from database import SessionLocal

    await manager.connect(ws)
    try:
        # Send initial state
        async with SessionLocal() as session:
            payload = await build_state_payload(session)
        await ws.send_json({"type": "STATE_UPDATE", "data": payload})
        while True:
            # Keep socket alive; ignore inbound msgs
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)
