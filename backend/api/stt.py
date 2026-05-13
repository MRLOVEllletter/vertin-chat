import os
import uuid
from fastapi import APIRouter, UploadFile, File
from backend.config import settings
from backend.models.schemas import STTResponse
from backend.services.whisper_service import transcribe

router = APIRouter()


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    temp_path = os.path.join(settings.stt_temp_dir, f"{uuid.uuid4()}{ext}")
    with open(temp_path, "wb") as f:
        f.write(await file.read())
    try:
        text, lang, duration_ms = transcribe(temp_path)
        return STTResponse(text=text, language=lang, duration_ms=duration_ms)
    finally:
        os.remove(temp_path)
