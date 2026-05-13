import base64
import io
import re
import wave
import numpy as np
import httpx
from backend.config import settings

REF_WAV_PATH = "e1.wav"
PROMPT_TEXT = "Are you still allow a point of contact for the Foundation, Madam Z?"
PROMPT_LANG = "en"

SILENCE_THRESHOLD = 0.02
LEADING_PAD_MS = 50
SILENCE_BETWEEN_MS = 150   # gap between sentence chunks


def split_sentences(text: str) -> list[str]:
    """Split text into short sentence chunks for TTS."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    result = []
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        # If a sentence is still long, split further by commas
        if len(s) > 100:
            parts = re.split(r"(?<=[,;:])\s+", s)
            result.extend(p.strip() for p in parts if p.strip())
        else:
            result.append(s)
    return result


def trim_leading_silence(samples: np.ndarray, sr: int) -> np.ndarray:
    """Remove leading silence from samples."""
    abs_sig = np.abs(samples)
    above = np.where(abs_sig > SILENCE_THRESHOLD)[0]
    if len(above) == 0:
        return samples
    start = max(0, above[0] - int(sr * LEADING_PAD_MS / 1000))
    return samples[start:]


async def synthesize_one(text: str, client: httpx.AsyncClient) -> bytes:
    """Synthesize a single text chunk and return WAV bytes."""
    params = {
        "text": text,
        "text_language": "en",
        "refer_wav_path": REF_WAV_PATH,
        "prompt_text": PROMPT_TEXT,
        "prompt_language": PROMPT_LANG,
        "media_type": "wav",
    }
    resp = await client.get(f"{settings.gpt_sovits_url}/", params=params)
    resp.raise_for_status()
    return resp.content


def parse_wav_to_samples(wav_bytes: bytes) -> tuple[int, np.ndarray]:
    """Extract sample rate and float samples from WAV bytes."""
    with wave.open(io.BytesIO(wav_bytes), "rb") as w:
        sr = w.getframerate()
        n_channels = w.getnchannels()
        raw = w.readframes(w.getnframes())
    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    if n_channels == 2:
        samples = samples.reshape(-1, 2).max(axis=1)
    return sr, samples


def samples_to_wav(samples: np.ndarray, sr: int) -> bytes:
    """Convert float samples to WAV bytes."""
    trimmed = np.clip(samples, -1.0, 1.0)
    int16 = (trimmed * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(int16.tobytes())
    return buf.getvalue()


async def synthesize(text: str, speed: float = 1.0) -> tuple[str, int]:
    chunks = split_sentences(text)
    if not chunks:
        return "", 0

    async with httpx.AsyncClient(timeout=60) as client:
        all_samples = []
        target_sr = None

        for i, chunk in enumerate(chunks):
            try:
                wav_data = await synthesize_one(chunk, client)
                sr, samples = parse_wav_to_samples(wav_data)

                if target_sr is None:
                    target_sr = sr

                # Trim leading silence from each chunk
                samples = trim_leading_silence(samples, sr)

                # Add silence gap between chunks
                if i > 0 and len(all_samples) > 0:
                    gap = np.zeros(int(sr * SILENCE_BETWEEN_MS / 1000))
                    all_samples.append(gap)

                all_samples.append(samples)
            except Exception as e:
                print(f"TTS chunk {i} failed: {e}")

        if not all_samples:
            return "", 0

        combined = np.concatenate(all_samples)

        # Trim leading silence from whole result
        combined = trim_leading_silence(combined, target_sr)

        wav_bytes = samples_to_wav(combined, target_sr)
        audio_b64 = base64.b64encode(wav_bytes).decode("utf-8")
        duration_ms = int(len(combined) / target_sr * 1000)
        return audio_b64, duration_ms
