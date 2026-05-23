import asyncio
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database import init_db
from backend.api import stt, chat, tts, stream
from backend.api import auth as auth_api
from backend.api import bots as bots_api
from backend.api import conversations as conversations_api
from backend.api import config as config_api
from backend.api import history as history_api
from backend.services.whisper_service import get_whisper_model

app = FastAPI(title="Vertin English Tutor", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.stt_temp_dir, exist_ok=True)

app.include_router(auth_api.router, prefix="/api")
app.include_router(bots_api.router, prefix="/api")
app.include_router(conversations_api.router, prefix="/api")
app.include_router(stt.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(tts.router, prefix="/api")
app.include_router(stream.router, prefix="/api")
app.include_router(config_api.router, prefix="/api")
app.include_router(history_api.router, prefix="/api")


@app.on_event("startup")
async def startup():
    await init_db()
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, lambda: (
        print("Preloading Whisper model..."),
        get_whisper_model(),
        print("Whisper model loaded!")
    ))


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/ready")
async def ready():
    from backend.services.whisper_service import _model
    if _model is None:
        return {"ready": False, "message": "Whisper model still loading"}
    return {"ready": True}
