import base64
import io
import json
import os
import time
from datetime import datetime
import wave
import numpy as np
import httpx
from backend.config import settings

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

# Reference audio configuration
REF_WAV_PATH = "e1.wav"
PROMPT_TEXT = "Are you still allow a point of contact for the Foundation, Madam Z?"
PROMPT_LANG = "en"


def log_tts(text: str, audio_bytes: bytes, duration_ms: int, status: str = "ok", error: str = ""):
    """Log TTS request details for debugging."""
    try:
        sr, amp_max, amp_mean, has_clip = 0, 0.0, 0.0, False
        try:
            with wave.open(io.BytesIO(audio_bytes), "rb") as w:
                sr = w.getframerate()
                raw = w.readframes(min(w.getnframes(), 48000 * 30))
                if len(raw) > 0:
                    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
                    amp_max = float(np.max(np.abs(samples)))
                    amp_mean = float(np.mean(np.abs(samples)))
                    has_clip = bool(np.sum(np.abs(samples) > 0.99) > 0)
        except Exception:
            pass

        entry = {
            "time": datetime.now().isoformat(),
            "text": text[:120],
            "text_len": len(text),
            "audio_size": len(audio_bytes),
            "duration_ms": duration_ms,
            "sample_rate": sr,
            "amp_max": round(amp_max, 4),
            "amp_mean": round(amp_mean, 4),
            "has_clipping": has_clip,
            "status": status,
            "error": error[:200] if error else "",
        }
        log_path = os.path.join(LOG_DIR, "tts_log.jsonl")
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass


async def synthesize(text: str, speed: float = 1.0) -> tuple[str, int]:
    params = {
        "text": text,
        "text_language": "en",
        "refer_wav_path": REF_WAV_PATH,
        "prompt_text": PROMPT_TEXT,
        "prompt_language": PROMPT_LANG,
        "speed": speed,
        "media_type": "wav",
    }
    async with httpx.AsyncClient(timeout=60) as client:
        start = time.time()
        try:
            resp = await client.get(f"{settings.gpt_sovits_url}/", params=params)
            resp.raise_for_status()
            audio_bytes = resp.content
            elapsed = time.time() - start
            duration_ms = int(len(audio_bytes) / 32000 / 2 * 1000)
            log_tts(text, audio_bytes, duration_ms)
            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
            return audio_b64, duration_ms
        except Exception as e:
            log_tts(text, b"", 0, status="error", error=str(e))
            raise
