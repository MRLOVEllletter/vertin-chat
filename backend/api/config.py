import json
import os
from fastapi import APIRouter
from backend.config import settings
from backend.models.schemas import ConfigUpdate

router = APIRouter()
CONFIG_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "app_config.json")


def _load_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {}


def _save_config(cfg: dict):
    with open(CONFIG_FILE, "w") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


@router.get("/config")
async def get_config():
    cfg = _load_config()
    return {
        "system_prompt": cfg.get("system_prompt", ""),
        "difficulty": cfg.get("difficulty", "intermediate"),
        "scenario": cfg.get("scenario", "daily"),
    }


@router.put("/config")
async def update_config(update: ConfigUpdate):
    cfg = _load_config()
    for key, val in update.model_dump(exclude_none=True).items():
        cfg[key] = val
    _save_config(cfg)
    return {"status": "ok"}
