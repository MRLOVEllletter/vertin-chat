import asyncio
from fastapi import APIRouter
from backend.models.schemas import ChatRequest, ChatResponse
from backend.services.deepseek_service import chat as deepseek_chat

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    reply, usage = await asyncio.to_thread(
        deepseek_chat,
        user_message=req.message,
        history=req.history,
        system_prompt=req.system_prompt,
        difficulty=req.difficulty,
    )
    return ChatResponse(reply=reply, usage=usage)
