import re
from fastapi import APIRouter, Depends, HTTPException
from backend.database import get_db
from backend.auth import hash_password, verify_password, create_token, get_current_user
from backend.models.schemas import UserRegister, UserLogin, AuthResponse, UserResponse

router = APIRouter()

EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


@router.post("/auth/register", response_model=AuthResponse)
async def register(body: UserRegister):
    if not EMAIL_RE.match(body.email):
        raise HTTPException(400, "Invalid email format")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    async with get_db() as db:
        cursor = await db.execute("SELECT id FROM users WHERE email = ?", (body.email,))
        if await cursor.fetchone():
            raise HTTPException(409, "Email already registered")

        pw_hash = hash_password(body.password)
        cursor = await db.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (body.email, pw_hash),
        )
        await db.commit()
        user_id = cursor.lastrowid

        token = create_token(user_id, body.email)
        return AuthResponse(
            token=token,
            user=UserResponse(id=user_id, email=body.email, created_at=""),
        )


@router.post("/auth/login", response_model=AuthResponse)
async def login(body: UserLogin):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, email, password_hash, created_at FROM users WHERE email = ?",
            (body.email,),
        )
        row = await cursor.fetchone()
        if not row or not verify_password(body.password, row["password_hash"]):
            raise HTTPException(401, "Invalid email or password")

        token = create_token(row["id"], row["email"])
        return AuthResponse(
            token=token,
            user=UserResponse(id=row["id"], email=row["email"], created_at=row["created_at"]),
        )


@router.get("/auth/me", response_model=UserResponse)
async def me(user: dict = Depends(get_current_user)):
    return UserResponse(id=user["id"], email=user["email"], created_at=user["created_at"])
