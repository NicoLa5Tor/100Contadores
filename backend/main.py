import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from database import engine, Base, SessionLocal
from routers import game, ws
from seed import seed_if_empty

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("main")


async def _wait_for_db(max_attempts: int = 30):
    for i in range(max_attempts):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(lambda c: None)
            return
        except Exception as e:
            log.info(f"db not ready ({i+1}/{max_attempts}): {e}")
            await asyncio.sleep(2)
    raise RuntimeError("db never became ready")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _wait_for_db()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with SessionLocal() as session:
        await seed_if_empty(session)
    yield


app = FastAPI(title="100 Contadores Dijeron", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(game.router)
app.include_router(ws.router)


@app.get("/")
async def root():
    return {"name": "100 Contadores Dijeron", "status": "ok"}
