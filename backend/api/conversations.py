from fastapi import APIRouter, Depends, HTTPException
from backend.database import get_db
from backend.auth import get_current_user
from backend.models.schemas import (
    ConversationCreate,
    ConversationDetail,
    ConversationSummary,
    MessageResponse,
    MessageCreate,
)

router = APIRouter()


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(
    bot_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(get_current_user),
):
    async with get_db() as db:
        if bot_id is not None:
            cursor = await db.execute(
                """SELECT c.id, c.bot_id, b.name as bot_name, c.title, c.created_at, c.updated_at,
                   (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
                FROM conversations c JOIN bots b ON c.bot_id = b.id
                WHERE c.user_id = ? AND c.bot_id = ?
                ORDER BY c.updated_at DESC LIMIT ? OFFSET ?""",
                (user["id"], bot_id, limit, offset),
            )
        else:
            cursor = await db.execute(
                """SELECT c.id, c.bot_id, b.name as bot_name, c.title, c.created_at, c.updated_at,
                   (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
                FROM conversations c JOIN bots b ON c.bot_id = b.id
                WHERE c.user_id = ?
                ORDER BY c.updated_at DESC LIMIT ? OFFSET ?""",
                (user["id"], limit, offset),
            )
        rows = await cursor.fetchall()
        return [
            ConversationSummary(
                id=r["id"],
                bot_id=r["bot_id"],
                bot_name=r["bot_name"],
                title=r["title"],
                message_count=r["message_count"],
                created_at=r["created_at"],
                updated_at=r["updated_at"],
            )
            for r in rows
        ]


@router.post("/conversations", response_model=ConversationDetail)
async def create_conversation(
    body: ConversationCreate, user: dict = Depends(get_current_user)
):
    async with get_db() as db:
        # Verify bot exists
        cursor = await db.execute("SELECT id, name FROM bots WHERE id = ?", (body.bot_id,))
        bot = await cursor.fetchone()
        if not bot:
            raise HTTPException(404, "Bot not found")

        cursor = await db.execute(
            "INSERT INTO conversations (user_id, bot_id, title) VALUES (?, ?, ?)",
            (user["id"], body.bot_id, body.title),
        )
        await db.commit()
        conv_id = cursor.lastrowid

        return ConversationDetail(
            id=conv_id,
            bot_id=body.bot_id,
            bot_name=bot["name"],
            title=body.title,
            messages=[],
            created_at="",
            updated_at="",
        )


@router.get("/conversations/{conv_id}", response_model=ConversationDetail)
async def get_conversation(conv_id: int, user: dict = Depends(get_current_user)):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT c.id, c.bot_id, b.name as bot_name, c.title, c.created_at, c.updated_at "
            "FROM conversations c JOIN bots b ON c.bot_id = b.id "
            "WHERE c.id = ? AND c.user_id = ?",
            (conv_id, user["id"]),
        )
        conv = await cursor.fetchone()
        if not conv:
            raise HTTPException(404, "Conversation not found")

        cursor = await db.execute(
            "SELECT id, role, content, audio_base64, created_at FROM messages "
            "WHERE conversation_id = ? ORDER BY id ASC LIMIT 200",
            (conv_id,),
        )
        msgs = await cursor.fetchall()

        return ConversationDetail(
            id=conv["id"],
            bot_id=conv["bot_id"],
            bot_name=conv["bot_name"],
            title=conv["title"],
            messages=[
                MessageResponse(
                    id=m["id"],
                    role=m["role"],
                    content=m["content"],
                    audio_base64=m["audio_base64"],
                    created_at=m["created_at"],
                )
                for m in msgs
            ],
            created_at=conv["created_at"],
            updated_at=conv["updated_at"],
        )


@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: int, user: dict = Depends(get_current_user)):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
            (conv_id, user["id"]),
        )
        if not await cursor.fetchone():
            raise HTTPException(404, "Conversation not found")

        await db.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
        await db.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
        await db.commit()
        return {"status": "ok"}


@router.post("/conversations/{conv_id}/messages")
async def add_message(
    conv_id: int, body: MessageCreate, user: dict = Depends(get_current_user)
):
    """Persist a message to a conversation and update its timestamp."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
            (conv_id, user["id"]),
        )
        if not await cursor.fetchone():
            raise HTTPException(404, "Conversation not found")

        await db.execute(
            "INSERT INTO messages (conversation_id, role, content, audio_base64) VALUES (?, ?, ?, ?)",
            (conv_id, body.role, body.content, body.audio_base64),
        )
        await db.execute(
            "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
            (conv_id,),
        )
        await db.commit()
        return {"status": "ok"}
