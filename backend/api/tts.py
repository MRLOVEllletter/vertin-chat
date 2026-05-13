from fastapi import APIRouter
from backend.models.schemas import TTSRequest, TTSResponse
from backend.services.tts_service import synthesize

router = APIRouter()


@router.post("/tts", response_model=TTSResponse)
async def tts_endpoint(req: TTSRequest):
    audio_b64, duration_ms = await synthesize(req.text, req.speed)
    return TTSResponse(audio_base64=audio_b64, duration_ms=duration_ms)
