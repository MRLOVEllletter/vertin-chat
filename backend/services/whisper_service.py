import asyncio
import time
import httpx
from backend.config import settings

# Local Whisper (lazy-loaded only if stt_provider=whisper)
_model = None
_gpu_lock = asyncio.Lock()


def get_whisper_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel(
            settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
    return _model


async def transcribe_whisper(audio_path: str) -> tuple[str, str, int]:
    async with _gpu_lock:
        model = get_whisper_model()
        start = time.time()
        segments, info = model.transcribe(audio_path, language="en", beam_size=5)
        text = " ".join(seg.text.strip() for seg in segments)
        duration_ms = int((time.time() - start) * 1000)
        return text, info.language, duration_ms


async def transcribe_deepgram(audio_path: str) -> tuple[str, str, int]:
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    t0 = time.time()
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.deepgram.com/v1/listen",
            params={
                "model": settings.deepgram_model,
                "smart_format": "true",
                "language": "en",
                "keyterm": "Vertin:1.0",
            },
            headers={"Authorization": f"Token {settings.deepgram_api_key}", "Content-Type": "audio/wav"},
            content=audio_bytes,
        )
        resp.raise_for_status()
        data = resp.json()
        duration_ms = int((time.time() - t0) * 1000)
        text = data["results"]["channels"][0]["alternatives"][0]["transcript"]
        detected_lang = data["results"]["channels"][0].get("detected_language", "en")
        return text, detected_lang, duration_ms


async def transcribe(audio_path: str) -> tuple[str, str, int]:
    if settings.stt_provider == "deepgram" and settings.deepgram_api_key:
        return await transcribe_deepgram(audio_path)
    return await transcribe_whisper(audio_path)
