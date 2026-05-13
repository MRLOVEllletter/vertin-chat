import os
from fastapi import APIRouter
from backend.models.schemas import TTSRequest, TTSResponse
from backend.services.tts_service import synthesize

router = APIRouter()


@router.post("/tts", response_model=TTSResponse)
async def tts_endpoint(req: TTSRequest):
    audio_b64, duration_ms = await synthesize(req.text, req.speed)
    return TTSResponse(audio_base64=audio_b64, duration_ms=duration_ms)


@router.get("/tts/logs")
async def tts_logs():
    """View recent TTS log entries."""
    log_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs", "tts_log.jsonl")
    if not os.path.exists(log_path):
        return {"logs": []}
    entries = []
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                import json
                entries.append(json.loads(line))
    return {"logs": entries[-20:]}
