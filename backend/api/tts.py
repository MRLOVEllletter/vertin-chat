import json
import os
from fastapi import APIRouter
from fastapi.responses import FileResponse
from backend.models.schemas import TTSRequest
from backend.services.tts_service import synthesize

router = APIRouter()
AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "audio_cache")


@router.post("/tts")
async def tts_endpoint(req: TTSRequest):
    audio_url, duration_ms = await synthesize(req.text, req.speed)
    return {"audio_url": audio_url, "duration_ms": duration_ms}


@router.get("/audio/{file_name:path}")
async def serve_audio(file_name: str):
    """Serve raw WAV file for browser playback."""
    import re
    if not re.match(r"^[a-f0-9]+\.wav$", file_name):
        return {"error": "Invalid file"}
    file_path = os.path.join(AUDIO_DIR, file_name)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/wav")
    return {"error": "File not found"}


@router.get("/tts/logs")
async def tts_logs():
    log_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs", "tts_log.jsonl")
    if not os.path.exists(log_path):
        return {"logs": []}
    entries = []
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return {"logs": entries[-20:]}
