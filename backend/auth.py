from datetime import datetime, timedelta, timezone
import jwt
import bcrypt
from fastapi import Request, HTTPException
from backend.config import settings


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


async def get_current_user(request: Request):
    """FastAPI dependency: extract user from Bearer token, return user dict."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid token")

    payload = decode_token(auth[7:])
    if not payload:
        raise HTTPException(401, "Invalid or expired token")

    from backend.database import get_db
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, email, created_at FROM users WHERE id = ?",
            (int(payload["sub"]),),
        )
        user = await cursor.fetchone()
        if not user:
            raise HTTPException(401, "User not found")
        return dict(user)
