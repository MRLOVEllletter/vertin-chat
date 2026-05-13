import asyncio
import base64
import io
import json
import os
import re
import time
from datetime import datetime
import wave
import numpy as np
import httpx
from backend.config import settings

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

REF_WAV_PATH = "e1.wav"
PROMPT_TEXT = "Are you still allow a point of contact for the Foundation, Madam Z?"
PROMPT_LANG = "en"

VOLUME_GAIN = 1.5  # Boost volume to compensate for quiet reference audio


def log_tts(text: str, audio_bytes: bytes, duration_ms: int, status: str = "ok", error: str = ""):
    try:
        sr, amp_max, amp_mean = 0, 0.0, 0.0
        try:
            with wave.open(io.BytesIO(audio_bytes), "rb") as w:
                sr = w.getframerate()
                raw = w.readframes(min(w.getnframes(), 48000 * 30))
                if len(raw) > 0:
                    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
                    amp_max = float(np.max(np.abs(samples)))
                    amp_mean = float(np.mean(np.abs(samples)))
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
            "status": status,
            "error": error[:200] if error else "",
        }
        with open(os.path.join(LOG_DIR, "tts_log.jsonl"), "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass


def split_text(text: str) -> list[str]:
    """Split text into short chunks suitable for TTS."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks = []
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        if len(s) > 80:
            parts = re.split(r"(?<=[,;:])\s+", s)
            chunks.extend(p.strip() for p in parts if p.strip())
        else:
            chunks.append(s)
    return chunks


def apply_gain(wav_bytes: bytes, gain: float = VOLUME_GAIN) -> bytes:
    """Apply volume gain to WAV audio."""
    try:
        with wave.open(io.BytesIO(wav_bytes), "rb") as w:
            sr = w.getframerate()
            n_channels = w.getnchannels()
            sampwidth = w.getsampwidth()
            raw = w.readframes(w.getnframes())

        if sampwidth != 2:
            return wav_bytes

        samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32)
        samples = np.clip(samples * gain, -32767, 32767).astype(np.int16)

        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(n_channels)
            w.setsampwidth(sampwidth)
            w.setframerate(sr)
            w.writeframes(samples.tobytes())
        return buf.getvalue()
    except Exception:
        return wav_bytes


def concat_wavs(wav_list: list[bytes], gap_ms: int = 100) -> tuple[bytes, int, int]:
    """Concatenate WAV chunks with silence gaps. Returns (wav_bytes, sr, total_frames)."""
    if not wav_list:
        return b"", 0, 0
    if len(wav_list) == 1:
        return wav_list[0], 0, 0

    all_samples: list[np.ndarray] = []
    target_sr = 48000
    gap_samples = int(target_sr * gap_ms / 1000)

    for i, wav in enumerate(wav_list):
        try:
            with wave.open(io.BytesIO(wav), "rb") as w:
                sr = w.getframerate()
                n_channels = w.getnchannels()
                raw = w.readframes(w.getnframes())
            samples = np.frombuffer(raw, dtype=np.int16)
            if n_channels == 2:
                samples = samples.reshape(-1, 2).mean(axis=1).astype(np.int16)
            if sr != target_sr:
                from scipy import signal
                old_len = len(samples)
                new_len = int(old_len * target_sr / sr)
                samples = signal.resample(samples.astype(np.float32), new_len).astype(np.int16)
            if i > 0 and gap_samples > 0:
                all_samples.append(np.zeros(gap_samples, dtype=np.int16))
            all_samples.append(samples)
        except Exception:
            continue

    if not all_samples:
        return wav_list[0], 0, 0

    combined = np.concatenate(all_samples)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(target_sr)
        w.writeframes(combined.tobytes())
    return buf.getvalue(), target_sr, len(combined)


async def synthesize(text: str, speed: float = 1.0) -> tuple[str, int]:
    chunks = split_text(text)
    if not chunks:
        return "", 0

    async with httpx.AsyncClient(timeout=60) as client:
        wavs = []
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
                wavs.append(resp.content)
            except Exception:
                pass

        if not wavs:
            return "", 0

        concat, sr, frames = concat_wavs(wavs)
        if concat:
            concat = apply_gain(concat)
            duration_ms = int(frames / sr * 1000) if sr > 0 else 0
            log_tts(text, concat, duration_ms)
            audio_b64 = base64.b64encode(concat).decode("utf-8")
            return audio_b64, duration_ms

        # Fallback to first chunk
        first = apply_gain(wavs[0])
        duration_ms = int(len(first) / 32000 / 2 * 1000)
        log_tts(text, first, duration_ms)
        audio_b64 = base64.b64encode(first).decode("utf-8")
        return audio_b64, duration_ms
