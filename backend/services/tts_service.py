import base64
import httpx
from backend.config import settings

# Reference audio for Vertin voice (relative to GPT-SoVITS working directory)
REF_WAV_PATH = "e1.wav"
PROMPT_TEXT = "Are you still allow a point of contact for the Foundation, Madam Z?"
PROMPT_LANG = "en"


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
        resp = await client.get(f"{settings.gpt_sovits_url}/", params=params)
        resp.raise_for_status()
        audio_bytes = resp.content
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        duration_ms = int(len(audio_bytes) / 32000 / 2 * 1000)
        return audio_b64, duration_ms
