import io
import json
import os
import re
import uuid
from datetime import datetime
import wave
import numpy as np
import httpx
from backend.config import settings

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "audio_cache")
os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

REF_WAV_PATH = "e1.wav"
PROMPT_TEXT = "Are you still allow a point of contact for the Foundation, Madam Z?"
PROMPT_LANG = "en"

TRIM_START_MS = 50      # remove garbled warm-up at start of each chunk
SILENCE_GAP_MS = 60     # small gap between chunks


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


def split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    result = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if len(p) > 80:
            sub = re.split(r"(?<=[,;:])\s+", p)
            result.extend(s.strip() for s in sub if s.strip())
        else:
            result.append(p)
    return result


def read_wav(wav_bytes: bytes) -> tuple[int, int, int, np.ndarray]:
    """Read WAV into (sample_rate, channels, sample_width, samples_float32)."""
    with wave.open(io.BytesIO(wav_bytes), "rb") as w:
        sr = w.getframerate()
        channels = w.getnchannels()
        sw = w.getsampwidth()
        raw = w.readframes(w.getnframes())
    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    if channels == 2:
        samples = samples.reshape(-1, 2).mean(axis=1)
    return sr, channels, sw, samples


def write_wav(samples: np.ndarray, sr: int, sw: int = 2) -> bytes:
    """Write float32 samples to mono 16-bit WAV bytes."""
    clipped = np.clip(samples, -1.0, 1.0)
    int16 = (clipped * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(sw)
        w.setframerate(sr)
        w.writeframes(int16.tobytes())
    return buf.getvalue()


async def synthesize(text: str, speed: float = 1.0) -> tuple[str, int]:
    chunks = split_sentences(text)
    if not chunks:
        return "", 0

    async with httpx.AsyncClient(timeout=60) as client:
        all_samples: list[np.ndarray] = []
        target_sr = 48000

        for chunk in chunks:
            params = {
                "text": chunk,
                "text_language": "en",
                "refer_wav_path": REF_WAV_PATH,
                "prompt_text": PROMPT_TEXT,
                "prompt_language": PROMPT_LANG,
                "speed": speed,
                "media_type": "wav",
            }
            try:
                resp = await client.get(f"{settings.gpt_sovits_url}/", params=params)
                resp.raise_for_status()

                sr, _, _, samples = read_wav(resp.content)
                target_sr = sr

                # Trim warm-up from start of this chunk
                trim_frames = int(sr * TRIM_START_MS / 1000)
                if len(samples) > trim_frames:
                    samples = samples[trim_frames:]

                # Skip if nothing left
                if len(samples) < int(sr * 0.05):
                    continue

                if all_samples:
                    # Add small silence gap
                    gap = np.zeros(int(sr * SILENCE_GAP_MS / 1000))
                    all_samples.append(gap)

                all_samples.append(samples)

            except Exception as e:
                print(f"TTS chunk failed: {e}")

        if not all_samples:
            return "", 0

        combined = np.concatenate(all_samples)
        wav_bytes = write_wav(combined, target_sr)

        duration_ms = int(len(combined) / target_sr * 1000)
        log_tts(text, wav_bytes, duration_ms)

        file_id = uuid.uuid4().hex[:12]
        file_path = os.path.join(AUDIO_DIR, f"{file_id}.wav")
        with open(file_path, "wb") as f:
            f.write(wav_bytes)

        return f"/api/audio/{file_id}.wav", duration_ms
