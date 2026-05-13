import json
import os
import re
from fastapi import APIRouter, HTTPException
from backend.config import settings

router = APIRouter()

VALID_SESSION = re.compile(r"^[a-zA-Z0-9_-]+$")


def _validate_session(session_id: str):
    if not VALID_SESSION.match(session_id):
        raise HTTPException(status_code=400, detail="Invalid session_id")


def _history_path(session_id: str) -> str:
    return os.path.join(settings.history_dir, f"{session_id}.json")


@router.get("/history")
async def list_history():
    files = []
    if os.path.exists(settings.history_dir):
        for fname in os.listdir(settings.history_dir):
            if fname.endswith(".json") and fname != "app_config.json":
                files.append({"session_id": fname.replace(".json", "")})
    return {"sessions": sorted(files, key=lambda x: x["session_id"], reverse=True)}


@router.get("/history/{session_id}")
async def get_history(session_id: str):
    _validate_session(session_id)
    path = _history_path(session_id)
    if not os.path.exists(path):
        return {"messages": []}
    with open(path) as f:
        return json.load(f)


@router.delete("/history/{session_id}")
async def delete_history(session_id: str):
    _validate_session(session_id)
    path = _history_path(session_id)
    if os.path.exists(path):
        os.remove(path)
    return {"status": "ok"}
