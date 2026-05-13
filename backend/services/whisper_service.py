import time
from faster_whisper import WhisperModel

from backend.config import settings

_model = None


def get_whisper_model():
    global _model
    if _model is None:
        _model = WhisperModel(
            settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
    return _model


def transcribe(audio_path: str) -> tuple[str, str, int]:
    model = get_whisper_model()
    start = time.time()
    segments, info = model.transcribe(audio_path, language="en", beam_size=5)
    text = " ".join(seg.text.strip() for seg in segments)
    duration_ms = int((time.time() - start) * 1000)
    return text, info.language, duration_ms
