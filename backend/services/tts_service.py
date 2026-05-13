import io
import json
import os
import re
import struct
import uuid
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

TRIM_MS = 100       # remove warm-up noise from each chunk's start
GAP_MS = 30         # small silence between chunks
WAV_HEADER_SIZE = 44  # standard PCM WAV header


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
    """Split text into short sentence chunks for TTS."""
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


def parse_wav_header(data: bytes) -> tuple[int, int, int, int, int]:
    """Parse WAV header. Returns (sample_rate, channels, bits_per_sample, data_offset, data_size)."""
    # RIFF header
    riff_size = struct.unpack_from("<I", data, 4)[0]
    fmt = struct.unpack_from("<HHIIHH", data, 20)
    audio_format = fmt[0]
    channels = fmt[1]
    sample_rate = fmt[2]
    bits_per_sample = fmt[5]
    # Find data chunk
    offset = 12
    while offset < len(data) - 8:
        chunk_id = data[offset:offset+4]
        chunk_size = struct.unpack_from("<I", data, offset+4)[0]
        if chunk_id == b"data":
            return sample_rate, channels, bits_per_sample, offset + 8, chunk_size
        offset += 8 + chunk_size
    return sample_rate, channels, bits_per_sample, 44, len(data) - 44


def build_wav_header(sample_rate: int, channels: int, bits: int, data_size: int) -> bytes:
    """Build a standard PCM WAV header."""
    bytes_per_frame = channels * bits // 8
    header = bytearray(WAV_HEADER_SIZE)
    struct.pack_into("<4sI4s", header, 0, b"RIFF", 36 + data_size, b"WAVE")
    struct.pack_into("<4sIHHIIHH", header, 12,
                     b"fmt ", 16, 1, channels, sample_rate,
                     sample_rate * bytes_per_frame, bytes_per_frame, bits)
    struct.pack_into("<4sI", header, 36, b"data", data_size)
    return bytes(header)


async def synthesize(text: str, speed: float = 1.0) -> tuple[str, int]:
    chunks = split_sentences(text)
    if not chunks:
        return "", 0

    async with httpx.AsyncClient(timeout=60) as client:
        all_pcm = bytearray()
        sr = 48000
        channels = 1
        bits = 16
        total_duration_ms = 0

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
                wav_data = resp.content

                # Parse WAV to get PCM data
                c_sr, c_ch, c_bits, data_off, data_size = parse_wav_header(wav_data)
                sr, channels, bits = c_sr, c_ch, c_bits
                pcm = wav_data[data_off:data_off+data_size]

                # Trim warm-up from start
                trim_bytes = int(sr * TRIM_MS / 1000) * (channels * bits // 8)
                if len(pcm) > trim_bytes:
                    pcm = pcm[trim_bytes:]

                # Skip if too short
                if len(pcm) < sr * 0.05 * (channels * bits // 8):
                    continue

                # Add silence gap between chunks
                if i > 0:
                    gap_bytes = int(sr * GAP_MS / 1000) * (channels * bits // 8)
                    all_pcm.extend(b"\x00" * gap_bytes)
                    total_duration_ms += GAP_MS

                all_pcm.extend(pcm)
                total_duration_ms += len(pcm) // (channels * bits // 8) // sr * 1000

            except Exception as e:
                print(f"TTS chunk {i} failed: {e}")

        if not all_pcm:
            return "", 0

        # Build final WAV
        header = build_wav_header(sr, channels, bits, len(all_pcm))
        wav_bytes = header + bytes(all_pcm)

        duration_ms = int(len(all_pcm) / (channels * bits // 8) / sr * 1000)
        log_tts(text, wav_bytes, duration_ms)

        file_id = uuid.uuid4().hex[:12]
        file_path = os.path.join(AUDIO_DIR, f"{file_id}.wav")
        with open(file_path, "wb") as f:
            f.write(wav_bytes)

        return f"/api/audio/{file_id}.wav", duration_ms
