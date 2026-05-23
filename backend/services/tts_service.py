import json
import os
import uuid
import base64
import time
from datetime import datetime
import httpx
from backend.config import settings

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "audio_cache")
os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

FISH_AUDIO_URL = "https://api.fish.audio/v1/tts"

# Vertin reference audio for instant voice cloning
_REF_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "GPT-SoVITS", "e1.wav")
_REF_TEXT = "Are you still allow a point of contact for the Foundation, Madam Z?"


def _load_ref_audio() -> tuple[str, str]:
    """Load and base64-encode the Vertin reference audio. Cached at module level."""
    if os.path.exists(_REF_PATH):
        with open(_REF_PATH, "rb") as f:
            return base64.b64encode(f.read()).decode(), _REF_TEXT
    return "", ""


_REF_AUDIO_B64, _REF_AUDIO_TEXT = _load_ref_audio()


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
    """Call Fish Audio API, save WAV to audio_cache, return (url_path, duration_ms)."""
    headers = {
        "Authorization": f"Bearer {settings.fish_audio_api_key}",
        "Content-Type": "application/json",
    }

    body = {
        "text": text,
        "format": "wav",
        "latency": "balanced",
        "chunk_length": 200,
    }

    if settings.fish_audio_reference_id:
        body["reference_id"] = settings.fish_audio_reference_id
    elif _REF_AUDIO_B64:
        body["references"] = [
            {
                "audio": _REF_AUDIO_B64,
                "text": _REF_AUDIO_TEXT,
            }
        ]

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            t0 = time.time()
            resp = await client.post(FISH_AUDIO_URL, headers=headers, json=body)
            resp.raise_for_status()
            audio_bytes = resp.content

            duration_ms = int(time.time() - t0) * 1000
            # Try to get actual duration from WAV header
            if len(audio_bytes) > 44:
                data_len = len(audio_bytes) - 44
                # Fish Audio WAV is typically 44100 Hz, 16-bit mono
                actual_duration_ms = int(data_len / 44100 / 2 * 1000)
                duration_ms = actual_duration_ms

            log_tts(text, audio_bytes, duration_ms)

            file_id = uuid.uuid4().hex[:12]
            file_path = os.path.join(AUDIO_DIR, f"{file_id}.wav")
            with open(file_path, "wb") as f:
                f.write(audio_bytes)

            return f"/api/audio/{file_id}.wav", duration_ms

        except httpx.HTTPStatusError as e:
            error_body = ""
            try:
                error_body = e.response.text[:500]
            except Exception:
                pass
            error_msg = f"Fish Audio HTTP {e.response.status_code}: {error_body}"
            log_tts(text, b"", 0, status="error", error=error_msg)
            raise RuntimeError(error_msg) from e
        except Exception as e:
            log_tts(text, b"", 0, status="error", error=str(e))
            raise
