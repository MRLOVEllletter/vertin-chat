import json
import os
import base64
import time
from datetime import datetime
import httpx
from backend.config import settings

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

FISH_AUDIO_URL = "https://api.fish.audio/v1/tts"


def log_tts(text: str, audio_size: int, duration_ms: int, status: str = "ok", error: str = ""):
    try:
        entry = {
            "time": datetime.now().isoformat(),
            "text": text[:120],
            "text_len": len(text),
            "audio_size": audio_size,
            "duration_ms": duration_ms,
            "status": status,
            "error": error[:200] if error else "",
        }
        with open(os.path.join(LOG_DIR, "tts_log.jsonl"), "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass


async def synthesize(text: str, speed: float = 1.0) -> tuple[str, int]:
    """Call Fish Audio API, return (base64_wav, duration_ms)."""
    headers = {
        "Authorization": f"Bearer {settings.fish_audio_api_key}",
        "Content-Type": "application/json",
    }

    body: dict = {
        "text": text,
        "format": "wav",
        "latency": "balanced",
        "chunk_length": 200,
    }

    if settings.fish_audio_reference_id:
        body["reference_id"] = settings.fish_audio_reference_id

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            t0 = time.time()
            resp = await client.post(FISH_AUDIO_URL, headers=headers, json=body)
            resp.raise_for_status()
            audio_bytes = resp.content

            duration_ms = int(time.time() - t0) * 1000
            if len(audio_bytes) > 44:
                duration_ms = int((len(audio_bytes) - 44) / 44100 / 2 * 1000)

            b64 = base64.b64encode(audio_bytes).decode()
            log_tts(text, len(audio_bytes), duration_ms)
            return b64, duration_ms

        except httpx.HTTPStatusError as e:
            error_body = ""
            try:
                error_body = e.response.text[:500]
            except Exception:
                pass
            msg = f"Fish Audio HTTP {e.response.status_code}: {error_body}"
            log_tts(text, 0, 0, status="error", error=msg)
            raise RuntimeError(msg) from e
        except Exception as e:
            log_tts(text, 0, 0, status="error", error=str(e))
            raise
