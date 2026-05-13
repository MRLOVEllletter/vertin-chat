from pydantic import BaseModel
from typing import Optional


class STTResponse(BaseModel):
    text: str
    language: str
    duration_ms: int


class ChatRequest(BaseModel):
    message: str
    history: list[dict[str, str]] = []
    system_prompt: Optional[str] = None
    difficulty: str = "intermediate"
    scenario: str = "daily"


class ChatResponse(BaseModel):
    reply: str
    usage: Optional[dict] = None


class TTSRequest(BaseModel):
    text: str
    speed: float = 1.0


class TTSResponse(BaseModel):
    audio_base64: str
    duration_ms: int


class ConfigUpdate(BaseModel):
    system_prompt: Optional[str] = None
    difficulty: Optional[str] = None
    scenario: Optional[str] = None
    deepseek_api_key: Optional[str] = None


class Message(BaseModel):
    role: str
    content: str
    audio_base64: Optional[str] = None
