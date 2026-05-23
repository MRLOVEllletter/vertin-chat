from fastapi import APIRouter

router = APIRouter()

HISTORY_DIR = "conversation_history"


@router.get("/history")
async def list_history():
    # Legacy endpoint — replaced by /api/conversations
    return {"sessions": []}


@router.get("/history/{session_id}")
async def get_history(session_id: str):
    return {"messages": []}


@router.delete("/history/{session_id}")
async def delete_history(session_id: str):
    return {"status": "ok"}
