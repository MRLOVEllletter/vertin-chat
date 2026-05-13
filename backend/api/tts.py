import base64
from fastapi import APIRouter, Query
from fastapi.responses import Response
from backend.models.schemas import TTSRequest, TTSResponse
from backend.services.tts_service import synthesize

router = APIRouter()


@router.post("/tts", response_model=TTSResponse)
async def tts_endpoint(req: TTSRequest):
    audio_b64, duration_ms = await synthesize(req.text, req.speed)
    return TTSResponse(audio_base64=audio_b64, duration_ms=duration_ms)


@router.get("/tts/stream")
async def tts_stream(text: str = Query(...)):
    """Return raw WAV audio for direct browser playback."""
    audio_b64, _ = await synthesize(text)
    audio_bytes = base64.b64decode(audio_b64)
    return Response(content=audio_bytes, media_type="audio/wav")
