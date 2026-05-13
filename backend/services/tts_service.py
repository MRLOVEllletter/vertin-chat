import io
import json
import os
import re
import uuid
import time
from datetime import datetime
import wave
import httpx
from backend.config import settings

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "audio_cache")
os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

REF_WAV_PATH = "e1.wav"
PROMPT_TEXT = "Are you still allow a point of contact for the Foundation, Madam Z?"
PROMPT_LANG = "en"

SILENCE_GAP_MS = 80  # small gap between concatenated chunks


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
    """Split text into short chunks for TTS."""
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


def extract_samples(wav_bytes: bytes) -> tuple[int, int, int, bytes]:
    """Extract raw PCM samples from a WAV file.
    Returns (sample_rate, channels, sample_width, raw_pcm_data)."""
    with wave.open(io.BytesIO(wav_bytes), "rb") as w:
        sr = w.getframerate()
        channels = w.getnchannels()
        sw = w.getsampwidth()
        data = w.readframes(w.getnframes())
    return sr, channels, sw, data


def build_wav(samples: bytes, sr: int, channels: int, sw: int) -> bytes:
    """Build a WAV file from raw PCM data."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(sw)
        w.setframerate(sr)
        w.writeframes(samples)
    return buf.getvalue()


async def synthesize(text: str, speed: float = 1.0) -> tuple[str, int]:
    chunks = split_sentences(text)
    if not chunks:
        return "", 0

    async with httpx.AsyncClient(timeout=60) as client:
        all_chunks = []
        sr, channels, sw = 48000, 1, 2  # expected format

        for i, chunk in enumerate(chunks):
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

                chunk_sr, chunk_ch, chunk_sw, data = extract_samples(resp.content)
                # Use first chunk's format as reference
                if i == 0:
                    sr, channels, sw = chunk_sr, chunk_ch, chunk_sw

                # Add silence gap between chunks
                if i > 0 and all_chunks:
                    gap_frames = int(sr * SILENCE_GAP_MS / 1000)
                    gap = b"\x00\x00" * gap_frames  # 16-bit silence
                    all_chunks.append(gap)

                all_chunks.append(data)

            except Exception as e:
                print(f"TTS chunk {i} failed: {e}")

        if not all_chunks:
            return "", 0

        combined_data = b"".join(all_chunks)
        wav_bytes = build_wav(combined_data, sr, channels, sw)

        # Log and save
        duration_ms = int(len(combined_data) / (sw * channels) / sr * 1000)
        log_tts(text, wav_bytes, duration_ms)

        file_id = uuid.uuid4().hex[:12]
        file_path = os.path.join(AUDIO_DIR, f"{file_id}.wav")
        with open(file_path, "wb") as f:
            f.write(wav_bytes)

        return f"/api/audio/{file_id}.wav", duration_ms
