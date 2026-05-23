from pydantic import BaseModel
from typing import Optional


# ---- Auth ----
class UserRegister(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: str


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


# ---- Bots ----
class BotCreate(BaseModel):
    name: str
    system_prompt: str


class BotUpdate(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None


class BotResponse(BaseModel):
    id: int
    name: str
    system_prompt: str
    is_default: bool
    created_at: str


# ---- Conversations ----
class ConversationCreate(BaseModel):
    bot_id: int
    title: str = "New Conversation"


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    audio_base64: Optional[str] = None
    created_at: str


class MessageCreate(BaseModel):
    role: str
    content: str
    audio_base64: Optional[str] = None


class ConversationDetail(BaseModel):
    id: int
    bot_id: int
    bot_name: str
    title: str
    messages: list[MessageResponse]
    created_at: str
    updated_at: str


class ConversationSummary(BaseModel):
    id: int
    bot_id: int
    bot_name: str
    title: str
    message_count: int
    created_at: str
    updated_at: str


# ---- Chat ----
class ChatRequest(BaseModel):
    message: str
    history: list[dict[str, str]] = []
    system_prompt: Optional[str] = None
    difficulty: str = "intermediate"
    scenario: str = "daily"
    conversation_id: Optional[int] = None  # persist messages to this conversation


class ChatResponse(BaseModel):
    reply: str
    usage: Optional[dict] = None


# ---- TTS ----
class TTSRequest(BaseModel):
    text: str
    speed: float = 1.0


class TTSResponse(BaseModel):
    audio_base64: str
    duration_ms: int


# ---- STT ----
class STTResponse(BaseModel):
    text: str
    language: str
    duration_ms: int


# ---- Legacy ----
class ConfigUpdate(BaseModel):
    system_prompt: Optional[str] = None
    difficulty: Optional[str] = None
    scenario: Optional[str] = None
    deepseek_api_key: Optional[str] = None


class Message(BaseModel):
    role: str
    content: str
    audio_base64: Optional[str] = None
