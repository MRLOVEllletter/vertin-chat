from fastapi import APIRouter, Depends, HTTPException
from backend.database import get_db
from backend.auth import get_current_user
from backend.config import settings
from backend.models.schemas import BotCreate, BotUpdate, BotResponse

router = APIRouter()


@router.get("/bots", response_model=list[BotResponse])
async def list_bots(user: dict = Depends(get_current_user)):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, name, system_prompt, is_default, created_at FROM bots "
            "WHERE user_id IS NULL OR user_id = ? ORDER BY is_default DESC, id",
            (user["id"],),
        )
        rows = await cursor.fetchall()
        return [
            BotResponse(
                id=r["id"],
                name=r["name"],
                system_prompt=r["system_prompt"],
                is_default=bool(r["is_default"]),
                created_at=r["created_at"],
            )
            for r in rows
        ]


@router.post("/bots", response_model=BotResponse)
async def create_bot(body: BotCreate, user: dict = Depends(get_current_user)):
    if len(body.name) < 1 or len(body.name) > 50:
        raise HTTPException(400, "Name must be 1-50 characters")
    if len(body.system_prompt) < 1 or len(body.system_prompt) > 2000:
        raise HTTPException(400, "Prompt must be 1-2000 characters")

    async with get_db() as db:
        cursor = await db.execute(
            "SELECT COUNT(*) FROM bots WHERE user_id = ?", (user["id"],)
        )
        row = await cursor.fetchone()
        if row and row[0] >= settings.max_bots_per_user:
            raise HTTPException(400, f"Max {settings.max_bots_per_user} bots per user")

        cursor = await db.execute(
            "INSERT INTO bots (user_id, name, system_prompt) VALUES (?, ?, ?)",
            (user["id"], body.name, body.system_prompt),
        )
        await db.commit()
        bot_id = cursor.lastrowid

        return BotResponse(
            id=bot_id,
            name=body.name,
            system_prompt=body.system_prompt,
            is_default=False,
            created_at="",
        )


@router.put("/bots/{bot_id}", response_model=BotResponse)
async def update_bot(bot_id: int, body: BotUpdate, user: dict = Depends(get_current_user)):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, name, system_prompt, is_default, user_id FROM bots WHERE id = ?",
            (bot_id,),
        )
        bot = await cursor.fetchone()
        if not bot:
            raise HTTPException(404, "Bot not found")
        if bot["is_default"]:
            raise HTTPException(403, "Cannot edit default bot")
        if bot["user_id"] != user["id"]:
            raise HTTPException(403, "Not your bot")

        name = body.name if body.name is not None else bot["name"]
        prompt = body.system_prompt if body.system_prompt is not None else bot["system_prompt"]

        await db.execute(
            "UPDATE bots SET name = ?, system_prompt = ? WHERE id = ?",
            (name, prompt, bot_id),
        )
        await db.commit()

        return BotResponse(
            id=bot_id,
            name=name,
            system_prompt=prompt,
            is_default=False,
            created_at=bot["created_at"],
        )


@router.delete("/bots/{bot_id}")
async def delete_bot(bot_id: int, user: dict = Depends(get_current_user)):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT user_id, is_default FROM bots WHERE id = ?", (bot_id,)
        )
        bot = await cursor.fetchone()
        if not bot:
            raise HTTPException(404, "Bot not found")
        if bot["is_default"]:
            raise HTTPException(403, "Cannot delete default bot")
        if bot["user_id"] != user["id"]:
            raise HTTPException(403, "Not your bot")

        await db.execute("DELETE FROM conversations WHERE bot_id = ?", (bot_id,))
        await db.execute("DELETE FROM bots WHERE id = ?", (bot_id,))
        await db.commit()
        return {"status": "ok"}
