import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.api import stt, chat, tts, stream
from backend.api import config as config_api
from backend.api import history as history_api

app = FastAPI(title="Vertin English Tutor", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.stt_temp_dir, exist_ok=True)
os.makedirs(settings.history_dir, exist_ok=True)

app.include_router(stt.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(tts.router, prefix="/api")
app.include_router(stream.router, prefix="/api")
app.include_router(config_api.router, prefix="/api")
app.include_router(history_api.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
