import base64
import httpx
from backend.config import settings


async def synthesize(text: str, speed: float = 1.0) -> tuple[str, int]:
    params = {
        "text": text,
        "text_lang": "en",
        "ref_audio_path": "",
        "prompt_text": "",
        "prompt_lang": "en",
        "media_type": "wav",
        "streaming_mode": False,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{settings.gpt_sovits_url}/tts", params=params)
        resp.raise_for_status()
        audio_bytes = resp.content
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        duration_ms = int(len(audio_bytes) / 16000 / 2 * 1000)
        return audio_b64, duration_ms
