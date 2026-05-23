import json
import os
from fastapi import APIRouter
from backend.models.schemas import TTSRequest
from backend.services.tts_service import synthesize

router = APIRouter()


@router.post("/tts")
async def tts_endpoint(req: TTSRequest):
    b64, duration_ms = await synthesize(req.text, req.speed)
    return {"audio_url": f"data:audio/wav;base64,{b64}", "duration_ms": duration_ms}


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
