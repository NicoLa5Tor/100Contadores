from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # game_id -> set of WebSocket
        self.game_clients: Dict[int, Set[WebSocket]] = {}
        # lobby clients (overview list of games)
        self.lobby_clients: Set[WebSocket] = set()

    async def connect_game(self, game_id: int, ws: WebSocket):
        await ws.accept()
        self.game_clients.setdefault(game_id, set()).add(ws)

    async def connect_lobby(self, ws: WebSocket):
        await ws.accept()
        self.lobby_clients.add(ws)

    def disconnect_game(self, game_id: int, ws: WebSocket):
        if game_id in self.game_clients:
            self.game_clients[game_id].discard(ws)
            if not self.game_clients[game_id]:
                del self.game_clients[game_id]

    def disconnect_lobby(self, ws: WebSocket):
        self.lobby_clients.discard(ws)

    async def broadcast(self, game_id: int, payload: dict):
        dead = []
        for ws in list(self.game_clients.get(game_id, set())):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect_game(game_id, ws)

    async def broadcast_lobby(self, payload: dict):
        dead = []
        for ws in list(self.lobby_clients):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect_lobby(ws)


manager = ConnectionManager()


@router.websocket("/ws/games/{game_id}")
async def ws_game(ws: WebSocket, game_id: int):
    from routers.game import build_game_payload, _get_game
    from database import SessionLocal

    await manager.connect_game(game_id, ws)
    try:
        async with SessionLocal() as session:
            try:
                g = await _get_game(session, game_id)
                payload = await build_game_payload(session, g)
                await ws.send_json({"type": "STATE_UPDATE", "data": payload})
            except Exception as e:
                await ws.send_json({"type": "ERROR", "data": str(e)})
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_game(game_id, ws)
    except Exception:
        manager.disconnect_game(game_id, ws)


@router.websocket("/ws/lobby")
async def ws_lobby(ws: WebSocket):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from models import Game
    from routers.game import build_game_summary
    from database import SessionLocal

    await manager.connect_lobby(ws)
    try:
        async with SessionLocal() as session:
            res = await session.execute(
                select(Game).options(selectinload(Game.matches)).order_by(Game.created_at.desc())
            )
            games = res.scalars().all()
            summaries = [await build_game_summary(g) for g in games]
        await ws.send_json({"type": "LOBBY_UPDATE", "data": summaries})
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_lobby(ws)
    except Exception:
        manager.disconnect_lobby(ws)
