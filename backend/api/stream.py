import asyncio
import json
import os
import uuid
from fastapi import APIRouter, WebSocket
from backend.config import settings
from backend.services.whisper_service import transcribe
from backend.services.llm_service import chat as llm_chat
from backend.services.tts_service import synthesize

router = APIRouter()


@router.websocket("/chat/stream")
async def chat_stream(websocket: WebSocket):
    await websocket.accept()
    history = []
    system_prompt = None
    difficulty = "intermediate"

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            msg_type = data.get("type")

            if msg_type == "config":
                system_prompt = data.get("system_prompt", system_prompt)
                difficulty = data.get("difficulty", difficulty)
                await websocket.send_text(json.dumps({"type": "config_ack"}))
                continue

            if msg_type == "audio":
                temp_path = os.path.join(
                    settings.stt_temp_dir, f"{uuid.uuid4()}.wav"
                )
                try:
                    with open(temp_path, "wb") as f:
                        f.write(bytes(data["data"]))
                    await websocket.send_text(json.dumps({"type": "stt_start"}))

                    text, lang, stt_ms = await transcribe(temp_path)
                    await websocket.send_text(json.dumps({
                        "type": "stt_result",
                        "text": text,
                        "language": lang,
                    }))

                    reply, usage = await asyncio.to_thread(
                        llm_chat,
                        user_message=text,
                        history=history,
                        system_prompt=system_prompt,
                        difficulty=difficulty,
                    )

                    history.append({"role": "user", "content": text})
                    history.append({"role": "assistant", "content": reply})

                    await websocket.send_text(json.dumps({
                        "type": "chat_result",
                        "reply": reply,
                    }))

                    audio_b64, tts_ms = await synthesize(reply)
                    await websocket.send_text(json.dumps({
                        "type": "tts_result",
                        "audio_base64": audio_b64,
                        "duration_ms": tts_ms,
                    }))

                    await websocket.send_text(json.dumps({"type": "done"}))

                finally:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)

    except Exception as e:
        await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
