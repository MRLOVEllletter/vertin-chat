import json
import os
import uuid
import time
from datetime import datetime
import httpx
from backend.config import settings

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "audio_cache")
os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

REF_WAV_PATH = "e1.wav"
PROMPT_TEXT = "Are you still allow a point of contact for the Foundation, Madam Z?"
PROMPT_LANG = "en"
PREFIX_TEXT = "Um, let me see. "  # sacrificial prefix absorbed by model warm-up (~300ms)


def log_tts(text: str, audio_bytes: bytes, duration_ms: int, status: str = "ok", error: str = ""):
    try:
        entry = {
            "time": datetime.now().isoformat(),
            "text": text[:120],
            "text_len": len(text),
            "audio_size": len(audio_bytes),
            "duration_ms": duration_ms,
            "status": status,
            "error": error[:200] if error else "",
        }
        with open(os.path.join(LOG_DIR, "tts_log.jsonl"), "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass


async def synthesize(text: str, speed: float = 1.0) -> tuple[str, int]:
    params = {
        "text": PREFIX_TEXT + text,
        "text_language": "en",
        "refer_wav_path": REF_WAV_PATH,
        "prompt_text": PROMPT_TEXT,
        "prompt_language": PROMPT_LANG,
        "speed": speed,
        "media_type": "wav",
        "top_k": 5,
        "top_p": 1.0,
        "temperature": 1.0,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            resp = await client.get(f"{settings.gpt_sovits_url}/", params=params)
            resp.raise_for_status()
            audio_bytes = resp.content
            duration_ms = int(len(audio_bytes) / 32000 / 2 * 1000)
            log_tts(text, audio_bytes, duration_ms)

            # Save to file
            file_id = uuid.uuid4().hex[:12]
            file_path = os.path.join(AUDIO_DIR, f"{file_id}.wav")
            with open(file_path, "wb") as f:
                f.write(audio_bytes)

            return f"/api/audio/{file_id}.wav", duration_ms
        except Exception as e:
            log_tts(text, b"", 0, status="error", error=str(e))
            raise
