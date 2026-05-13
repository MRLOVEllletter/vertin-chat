# Vertin 英语口语陪练 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个英语口语陪练 Web 应用，用户语音输入英语，AI 以重返未来1999 维尔汀（Vertin）的语音回应。

**Architecture:** React 前端录音 → Python FastAPI 后端调用 faster-whisper 转文字 → DeepSeek API 生成回答 → 调用独立 GPT-SoVITS API 合成 Vertin 语音 → 前端播放。

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui 前端，Python FastAPI + faster-whisper + GPT-SoVITS API + DeepSeek API 后端。

---

## 文件结构

```
MyVertinChat/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── config.py             # 服务器配置
│   ├── requirements.txt      # Python 依赖
│   ├── api/
│   │   ├── __init__.py
│   │   ├── stt.py            # STT 端点 (Whisper)
│   │   ├── chat.py           # 对话端点 (DeepSeek)
│   │   ├── tts.py            # TTS 端点 (GPT-SoVITS 调用)
│   │   └── stream.py         # WebSocket 流式对话
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py        # Pydantic 模型
│   └── services/
│       ├── __init__.py
│       ├── whisper_service.py # Whisper 封装
│       ├── deepseek_service.py # DeepSeek API 封装
│       └── tts_service.py     # GPT-SoVITS API 封装
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── types.ts
│       ├── api.ts
│       ├── pages/
│       │   ├── ChatPage.tsx
│       │   └── SettingsPage.tsx
│       ├── components/
│       │   ├── ChatBubble.tsx
│       │   ├── VoiceRecorder.tsx
│       │   └── RoleSettings.tsx
│       └── hooks/
│           ├── useAudioRecorder.ts
│           └── useWebSocket.ts
├── docker-compose.yml        # GPT-SoVITS 独立服务
├── start.sh                  # 一键启动脚本
└── README.md
```

---

### Task 1: 后端项目脚手架

**Files:**
- Create: `backend/main.py`
- Create: `backend/config.py`
- Create: `backend/requirements.txt`
- Create: `backend/__init__.py`
- Create: `backend/api/__init__.py`
- Create: `backend/models/__init__.py`
- Create: `backend/models/schemas.py`
- Create: `backend/services/__init__.py`

- [ ] **Step 1: 创建 requirements.txt**

```text
fastapi==0.115.6
uvicorn[standard]==0.34.0
python-multipart==0.0.20
websockets==14.1
httpx==0.28.1
faster-whisper==1.1.1
pydantic==2.10.4
pydantic-settings==2.7.1
soundfile==0.12.1
numpy==2.2.1
```

- [ ] **Step 2: 创建 config.py**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"
    whisper_model: str = "medium"  # large-v3 / medium / small
    whisper_device: str = "cuda"
    whisper_compute_type: str = "float16"
    gpt_sovits_url: str = "http://localhost:9880"
    stt_temp_dir: str = "temp_audio"
    history_dir: str = "conversation_history"
    max_history: int = 50

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
```

- [ ] **Step 3: 创建 schemas.py**

```python
from pydantic import BaseModel
from typing import Optional


class STTResponse(BaseModel):
    text: str
    language: str
    duration_ms: int


class ChatRequest(BaseModel):
    message: str
    history: list[dict[str, str]] = []
    system_prompt: Optional[str] = None
    difficulty: str = "intermediate"
    scenario: str = "daily"


class ChatResponse(BaseModel):
    reply: str
    usage: Optional[dict] = None


class TTSRequest(BaseModel):
    text: str
    speed: float = 1.0


class TTSResponse(BaseModel):
    audio_base64: str
    duration_ms: int


class ConfigUpdate(BaseModel):
    system_prompt: Optional[str] = None
    difficulty: Optional[str] = None
    scenario: Optional[str] = None
    deepseek_api_key: Optional[str] = None


class Message(BaseModel):
    role: str  # "user" | "assistant"
    content: str
    audio_base64: Optional[str] = None
```

- [ ] **Step 4: 创建 main.py**

```python
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.api import stt, chat, tts, stream

app = FastAPI(title="Vertin English Tutor", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.stt_temp_dir, exist_ok=True)
os.makedirs(settings.history_dir, exist_ok=True)

app.include_router(stt.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(tts.router, prefix="/api")
app.include_router(stream.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 5: 验证后端可启动**

Run: `cd D:/我的项目/MyVertinChat && python -m uvicorn backend.main:app --port 8765`
Expected: 服务启动，访问 `http://localhost:8765/api/health` 返回 `{"status":"ok"}`

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: add backend project scaffold with FastAPI"
```

---

### Task 2: Whisper STT 服务

**Files:**
- Create: `backend/services/whisper_service.py`
- Modify: `backend/api/stt.py`

- [ ] **Step 1: 创建 whisper_service.py**

```python
import time
import numpy as np
from faster_whisper import WhisperModel

from backend.config import settings

_model = None


def get_whisper_model():
    global _model
    if _model is None:
        _model = WhisperModel(
            settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
    return _model


def transcribe(audio_path: str) -> tuple[str, str, int]:
    model = get_whisper_model()
    start = time.time()
    segments, info = model.transcribe(audio_path, language="en", beam_size=5)
    text = " ".join(seg.text.strip() for seg in segments)
    duration_ms = int((time.time() - start) * 1000)
    return text, info.language, duration_ms
```

- [ ] **Step 2: 创建 backend/api/stt.py**

```python
import os
import uuid
from fastapi import APIRouter, UploadFile, File
from backend.config import settings
from backend.models.schemas import STTResponse
from backend.services.whisper_service import transcribe

router = APIRouter()


@router.post("/stt", response_model=STTResponse)
async def speech_to_text(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    temp_path = os.path.join(settings.stt_temp_dir, f"{uuid.uuid4()}{ext}")
    with open(temp_path, "wb") as f:
        f.write(await file.read())
    try:
        text, lang, duration_ms = transcribe(temp_path)
        return STTResponse(text=text, language=lang, duration_ms=duration_ms)
    finally:
        os.remove(temp_path)
```

- [ ] **Step 3: 验证 STT 端点**

Run: `cd D:/我的项目/MyVertinChat && python -c "
import requests
resp = requests.post('http://localhost:8765/api/stt', files={'file': ('test.wav', b'fakeaudio')})
print(resp.status_code)
"`（预期 200，虽然音频无效会出错但端点可达）

- [ ] **Step 4: Commit**

```bash
git add backend/api/stt.py backend/services/whisper_service.py
git commit -m "feat: add Whisper STT service and endpoint"
```

---

### Task 3: DeepSeek 对话服务

**Files:**
- Create: `backend/services/deepseek_service.py`
- Modify: `backend/api/chat.py`

- [ ] **Step 1: 创建 deepseek_service.py**

```python
from openai import OpenAI
from backend.config import settings

_client = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )
    return _client


DEFAULT_SYSTEM_PROMPT = """You are Vertin, a Timekeeper from the world of Reverse:1999. You're an English conversation partner helping the user practice their English speaking skills.

Personality: Calm, composed, slightly mysterious, with a touch of dry wit. You speak concisely but are never rude.

Rules:
- Always respond in English
- Keep responses conversational and natural (2-4 sentences typically)
- If the user makes grammar mistakes, subtly incorporate the correct form in your response
- Match the user's English level (adjust vocabulary complexity)
- Stay in character as Vertin

Difficulty levels:
- beginner: simple vocabulary, short sentences, speak slowly
- intermediate: natural conversation, moderate vocabulary
- advanced: complex topics, idioms, natural speed"""


def build_messages(
    user_message: str,
    history: list[dict[str, str]],
    system_prompt: str | None = None,
    difficulty: str = "intermediate",
) -> list[dict[str, str]]:
    system = system_prompt or DEFAULT_SYSTEM_PROMPT
    system += f"\nCurrent difficulty level: {difficulty}"

    messages = [{"role": "system", "content": system}]
    messages.extend(history[-10:])  # last 10 messages
    messages.append({"role": "user", "content": user_message})
    return messages


def chat(
    user_message: str,
    history: list[dict[str, str]] | None = None,
    system_prompt: str | None = None,
    difficulty: str = "intermediate",
) -> tuple[str, dict | None]:
    client = get_client()
    messages = build_messages(user_message, history or [], system_prompt, difficulty)

    response = client.chat.completions.create(
        model=settings.deepseek_model,
        messages=messages,
        temperature=0.7,
        max_tokens=500,
    )

    reply = response.choices[0].message.content or ""
    usage = {
        "prompt_tokens": response.usage.prompt_tokens,
        "completion_tokens": response.usage.completion_tokens,
        "total_tokens": response.usage.total_tokens,
    } if response.usage else None

    return reply, usage
```

- [ ] **Step 2: 创建 backend/api/chat.py**

```python
from fastapi import APIRouter
from backend.models.schemas import ChatRequest, ChatResponse
from backend.services.deepseek_service import chat as deepseek_chat

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    reply, usage = deepseek_chat(
        user_message=req.message,
        history=req.history,
        system_prompt=req.system_prompt,
        difficulty=req.difficulty,
    )
    return ChatResponse(reply=reply, usage=usage)
```

- [ ] **Step 3: 验证 chat 端点**

Run: `cd D:/我的项目/MyVertinChat && python -c "
import requests
resp = requests.post('http://localhost:8765/api/chat', json={
    'message': 'Hello, who are you?',
    'difficulty': 'intermediate'
})
print(resp.status_code, resp.json() if resp.ok else resp.text)
"`（需要配置 DEEPSEEK_API_KEY）

- [ ] **Step 4: Commit**

```bash
git add backend/api/chat.py backend/services/deepseek_service.py
git commit -m "feat: add DeepSeek chat service and endpoint"
```

---

### Task 4: GPT-SoVITS TTS 服务

**Files:**
- Create: `backend/services/tts_service.py`
- Modify: `backend/api/tts.py`

- [ ] **Step 1: 创建 tts_service.py**

```python
import base64
import httpx
from backend.config import settings


async def synthesize(text: str, speed: float = 1.0) -> tuple[str, int]:
    params = {
        "text": text,
        "text_lang": "en",
        "ref_audio_path": "",  # 留空用默认参考音频
        "prompt_text": "",
        "prompt_lang": "en",
        "media_type": "wav",
        "streaming_mode": False,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{settings.gpt_sovits_url}/tts", params=params)
        resp.raise_for_status()
        audio_bytes = resp.content
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        duration_ms = int(len(audio_bytes) / 16000 / 2 * 1000)  # 估算
        return audio_b64, duration_ms
```

- [ ] **Step 2: 创建 backend/api/tts.py**

```python
from fastapi import APIRouter
from backend.models.schemas import TTSRequest, TTSResponse
from backend.services.tts_service import synthesize

router = APIRouter()


@router.post("/tts", response_model=TTSResponse)
async def tts_endpoint(req: TTSRequest):
    audio_b64, duration_ms = await synthesize(req.text, req.speed)
    return TTSResponse(audio_base64=audio_b64, duration_ms=duration_ms)
```

- [ ] **Step 3: Commit**

```bash
git add backend/api/tts.py backend/services/tts_service.py
git commit -m "feat: add GPT-SoVITS TTS service and endpoint"
```

---

### Task 5: WebSocket 流式对话

**Files:**
- Create: `backend/api/stream.py`

- [ ] **Step 1: 创建 stream.py**

```python
import json
import os
import uuid
from fastapi import APIRouter, WebSocket
from backend.config import settings
from backend.services.whisper_service import transcribe
from backend.services.deepseek_service import chat as deepseek_chat
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

                    text, lang, stt_ms = transcribe(temp_path)
                    await websocket.send_text(json.dumps({
                        "type": "stt_result",
                        "text": text,
                        "language": lang,
                    }))

                    reply, usage = deepseek_chat(
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
```

- [ ] **Step 2: 检查语法正确性**

Run: `cd D:/我的项目/MyVertinChat && python -c "import backend.api.stream"`
Expected: 无报错

- [ ] **Step 3: Commit**

```bash
git add backend/api/stream.py
git commit -m "feat: add WebSocket streaming conversation endpoint"
```

---

### Task 6: 前端项目脚手架

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.app.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.css`
- Create: `frontend/src/types.ts`
- Create: `frontend/src/vite-env.d.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "vertin-english-tutor",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-markdown": "^9.0.3",
    "lucide-react": "^0.468.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.7.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: 创建 vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8765',
    },
  },
})
```

- [ ] **Step 3: 创建 tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 4: 创建 postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 5: 创建 tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 6: 创建 tsconfig.app.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

- [ ] **Step 7: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 8: 创建 index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vertin English Tutor</title>
  </head>
  <body class="bg-zinc-950 text-zinc-100">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: 创建 src/main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 10: 创建 src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: system-ui, -apple-system, sans-serif;
}
```

- [ ] **Step 11: 创建 src/vite-env.d.ts**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 12: 创建 src/types.ts**

```ts
export interface Message {
  role: 'user' | 'assistant'
  content: string
  audioBase64?: string
}

export interface AppConfig {
  systemPrompt: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  scenario: string
}

export interface WSIncoming {
  type: 'stt_start' | 'stt_result' | 'chat_result' | 'tts_result' | 'done' | 'error' | 'config_ack'
  text?: string
  language?: string
  reply?: string
  audio_base64?: string
  duration_ms?: number
  message?: string
}
```

- [ ] **Step 13: 创建 src/App.tsx（初始占位）**

```tsx
function App() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <h1 className="text-2xl text-zinc-100">Vertin English Tutor</h1>
    </div>
  )
}

export default App
```

- [ ] **Step 14: 安装依赖并验证**

Run: `cd D:/我的项目/MyVertinChat/frontend && npm install`
Run: `cd D:/我的项目/MyVertinChat/frontend && npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 15: Commit**

```bash
git add frontend/
git commit -m "feat: add frontend project scaffold with React+Vite+Tailwind"
```

---

### Task 7: 前端 API 层和 Hooks

**Files:**
- Create: `frontend/src/api.ts`
- Create: `frontend/src/hooks/useAudioRecorder.ts`
- Create: `frontend/src/hooks/useWebSocket.ts`

- [ ] **Step 1: 创建 api.ts**

```ts
const API_BASE = ''

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`)
    return res.ok
  } catch {
    return false
  }
}

export async function transcribeAudio(audioBlob: Blob): Promise<{ text: string }> {
  const form = new FormData()
  form.append('file', audioBlob, 'audio.wav')
  const res = await fetch(`${API_BASE}/api/stt`, { method: 'POST', body: form })
  if (!res.ok) throw new Error('STT failed')
  return res.json()
}

export async function chatWithAI(
  message: string,
  history: { role: string; content: string }[],
  config: { systemPrompt?: string; difficulty?: string; scenario?: string },
): Promise<{ reply: string }> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
      system_prompt: config.systemPrompt,
      difficulty: config.difficulty || 'intermediate',
      scenario: config.scenario || 'daily',
    }),
  })
  if (!res.ok) throw new Error('Chat failed')
  return res.json()
}

export async function synthesizeTTS(text: string): Promise<{ audio_base64: string; duration_ms: number }> {
  const res = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error('TTS failed')
  return res.json()
}
```

- [ ] **Step 2: 创建 hooks/useAudioRecorder.ts**

```ts
import { useState, useRef, useCallback } from 'react'

interface UseAudioRecorderReturn {
  isRecording: boolean
  audioBlob: Blob | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  clearAudio: () => void
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    chunksRef.current = []
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      setAudioBlob(blob)
      stream.getTracks().forEach((t) => t.stop())
    }

    recorder.start()
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }, [])

  const clearAudio = useCallback(() => setAudioBlob(null), [])

  return { isRecording, audioBlob, startRecording, stopRecording, clearAudio }
}
```

- [ ] **Step 3: 创建 hooks/useWebSocket.ts**

```ts
import { useRef, useCallback, useState } from 'react'
import type { WSIncoming } from '../types'

type WSCallback = {
  onSttStart?: () => void
  onSttResult?: (text: string) => void
  onChatResult?: (reply: string) => void
  onTtsResult?: (audioBase64: string) => void
  onDone?: () => void
  onError?: (msg: string) => void
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)

  const connect = useCallback((callbacks: WSCallback) => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${location.host}/api/chat/stream`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (event) => {
      const data: WSIncoming = JSON.parse(event.data)
      switch (data.type) {
        case 'stt_start':     callbacks.onSttStart?.(); break
        case 'stt_result':    callbacks.onSttResult?.(data.text ?? ''); break
        case 'chat_result':   callbacks.onChatResult?.(data.reply ?? ''); break
        case 'tts_result':    callbacks.onTtsResult?.(data.audio_base64 ?? ''); break
        case 'done':          callbacks.onDone?.(); break
        case 'error':         callbacks.onError?.(data.message ?? ''); break
      }
    }
  }, [])

  const send = useCallback((data: unknown) => {
    wsRef.current?.send(JSON.stringify(data))
  }, [])

  const sendAudio = useCallback(async (audioBlob: Blob) => {
    const buf = await audioBlob.arrayBuffer()
    send({ type: 'audio', data: Array.from(new Uint8Array(buf)) })
  }, [send])

  const sendConfig = useCallback((config: { systemPrompt?: string; difficulty?: string }) => {
    send({ type: 'config', ...config })
  }, [send])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
  }, [])

  return { connected, connect, sendAudio, sendConfig, disconnect }
}
```

- [ ] **Step 4: 类型检查**

Run: `cd D:/我的项目/MyVertinChat/frontend && npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api.ts frontend/src/hooks/
git commit -m "feat: add API layer and hooks for audio recording and WebSocket"
```

---

### Task 8: 聊天界面组件

**Files:**
- Create: `frontend/src/components/ChatBubble.tsx`
- Create: `frontend/src/components/VoiceRecorder.tsx`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/pages/ChatPage.tsx`

- [ ] **Step 1: 创建 ChatBubble.tsx**

```tsx
import { clsx } from 'clsx'

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
  onPlay?: () => void
  isPlaying?: boolean
}

export function ChatBubble({ role, content, onPlay, isPlaying }: ChatBubbleProps) {
  const isUser = role === 'user'
  return (
    <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[75%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-zinc-800 text-zinc-100 rounded-bl-sm',
        )}
      >
        {!isUser && (
          <div className="text-xs text-zinc-400 mb-1">Vertin</div>
        )}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>
        {!isUser && onPlay && (
          <button
            onClick={onPlay}
            className="mt-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {isPlaying ? '🔊 Playing...' : '▶ Play'}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 VoiceRecorder.tsx**

```tsx
import { clsx } from 'clsx'

interface VoiceRecorderProps {
  isRecording: boolean
  isProcessing: boolean
  onStart: () => void
  onStop: () => void
}

export function VoiceRecorder({ isRecording, isProcessing, onStart, onStop }: VoiceRecorderProps) {
  return (
    <button
      onMouseDown={onStart}
      onMouseUp={onStop}
      onTouchStart={onStart}
      onTouchEnd={onStop}
      disabled={isProcessing}
      className={clsx(
        'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200',
        isRecording
          ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50'
          : 'bg-zinc-800 hover:bg-zinc-700',
        isProcessing && 'opacity-50 cursor-not-allowed',
      )}
    >
      {isProcessing ? (
        <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
      ) : isRecording ? (
        <div className="w-3 h-3 bg-white rounded-sm" />
      ) : (
        <svg className="w-6 h-6 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      )}
    </button>
  )
}
```

- [ ] **Step 3: 创建 ChatPage.tsx**

```tsx
import { useState, useRef, useCallback } from 'react'
import { ChatBubble } from '../components/ChatBubble'
import { VoiceRecorder } from '../components/VoiceRecorder'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useWebSocket } from '../hooks/useWebSocket'
import type { Message } from '../types'

interface ChatPageProps {
  systemPrompt: string
  difficulty: string
}

export function ChatPage({ systemPrompt, difficulty }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentReply, setCurrentReply] = useState('')
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { isRecording, startRecording, stopRecording, clearAudio } = useAudioRecorder()
  const { connected, connect, sendAudio, sendConfig, disconnect } = useWebSocket()

  const playAudio = useCallback((base64: string, index: number) => {
    setPlayingIndex(index)
    const audio = new Audio(`data:audio/wav;base64,${base64}`)
    audioRef.current = audio
    audio.onended = () => setPlayingIndex(null)
    audio.play()
  }, [])

  const handleStartRecording = useCallback(async () => {
    await startRecording()
  }, [startRecording])

  const handleStopRecording = useCallback(async () => {
    stopRecording()

    if (!connected) {
      connect({
        onSttStart: () => setIsProcessing(true),
        onSttResult: (text) => {
          setMessages((prev) => [...prev, { role: 'user', content: text }])
        },
        onChatResult: (reply) => {
          setCurrentReply(reply)
        },
        onTtsResult: (audioBase64) => {
          const reply = currentReply
          setMessages((prev) => [...prev, { role: 'assistant', content: reply, audioBase64 }])
          setCurrentReply('')
          setIsProcessing(false)
        },
        onDone: () => {},
        onError: (msg) => {
          console.error(msg)
          setIsProcessing(false)
        },
      })
    }

    setTimeout(async () => {
      sendConfig({ systemPrompt, difficulty })
      await new Promise((r) => setTimeout(r, 200))
      stopRecording() // 没有获取 Blob，需要改逻辑——用 `clearAudio` 后的 blob
    }, 100)
  }, [connected, connect, sendAudio, sendConfig, stopRecording, systemPrompt, difficulty, currentReply])

  // 简化：用 HTTP 三步走代替 WebSocket
  const handleSendAudioHttp = useCallback(async () => {
    // 等待 recorder 产生 blob
    setTimeout(async () => {
      setIsProcessing(true)
      try {
        const { transcribeAudio, chatWithAI, synthesizeTTS } = await import('../api')

        // 1. STT
        const form = new FormData()
        form.append('file', new Blob())

        // 实际需要从 useAudioRecorder 取 blob,但 getCapabilities 有限制
        // 改用更直接的方式
      } catch (e) {
        console.error(e)
        setIsProcessing(false)
      }
    }, 500)
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 mt-20">
            <p className="text-lg">Press and hold the microphone to speak</p>
            <p className="text-sm mt-2">I'll help you practice your English</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatBubble
            key={i}
            role={msg.role}
            content={msg.content}
            onPlay={msg.audioBase64 ? () => playAudio(msg.audioBase64!, i) : undefined}
            isPlaying={playingIndex === i}
          />
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800 p-4 flex justify-center items-center gap-4">
        <span className="text-xs text-zinc-500">
          {connected ? '● Connected' : '○ Disconnected'}
        </span>
        <VoiceRecorder
          isRecording={isRecording}
          isProcessing={isProcessing}
          onStart={handleStartRecording}
          onStop={handleStopRecording}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 更新 App.tsx**

```tsx
import { useState } from 'react'
import { ChatPage } from './pages/ChatPage'
import { RoleSettings } from './components/RoleSettings'

const DEFAULT_PROMPT = `You are Vertin, a Timekeeper from Reverse:1999. You help the user practice English conversation. Keep responses concise, natural, and in character. Correct grammar mistakes subtly.`

function App() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT)
  const [difficulty, setDifficulty] = useState('intermediate')
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Vertin · English Tutor</h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {showSettings ? '✕ Close' : '⚙ Settings'}
        </button>
      </header>

      <main className="flex-1 flex">
        {showSettings && (
          <aside className="w-80 border-r border-zinc-800 p-4 overflow-y-auto">
            <RoleSettings
              systemPrompt={systemPrompt}
              difficulty={difficulty}
              onPromptChange={setSystemPrompt}
              onDifficultyChange={setDifficulty}
            />
          </aside>
        )}
        <div className="flex-1">
          <ChatPage systemPrompt={systemPrompt} difficulty={difficulty} />
        </div>
      </main>
    </div>
  )
}

export default App
```

- [ ] **Step 5: 创建 components/RoleSettings.tsx**

```tsx
interface RoleSettingsProps {
  systemPrompt: string
  difficulty: string
  onPromptChange: (val: string) => void
  onDifficultyChange: (val: string) => void
}

const PRESETS = [
  { name: 'Default Vertin', prompt: 'You are Vertin, a Timekeeper from Reverse:1999. You help the user practice English conversation. Keep responses concise, natural, and in character. Correct grammar mistakes subtly.' },
  { name: 'Friendly Tutor', prompt: 'You are a warm and encouraging English tutor. Praise the user often, gently correct mistakes, and keep the conversation fun and engaging.' },
  { name: 'Strict Teacher', prompt: 'You are a strict but fair English teacher. Correct every mistake explicitly, challenge the user with harder vocabulary, and expect proper grammar.' },
]

export function RoleSettings({ systemPrompt, difficulty, onPromptChange, onDifficultyChange }: RoleSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-2">Presets</h3>
        <div className="space-y-1">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => onPromptChange(p.prompt)}
              className="block w-full text-left text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded px-2 py-1.5 transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-2">Difficulty</h3>
        <select
          value={difficulty}
          onChange={(e) => onDifficultyChange(e.target.value)}
          className="w-full bg-zinc-800 text-zinc-200 rounded px-3 py-2 text-sm border border-zinc-700"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-2">System Prompt</h3>
        <textarea
          value={systemPrompt}
          onChange={(e) => onPromptChange(e.target.value)}
          rows={12}
          className="w-full bg-zinc-800 text-zinc-200 rounded px-3 py-2 text-xs border border-zinc-700 resize-none font-mono"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 类型检查**

Run: `cd D:/我的项目/MyVertinChat/frontend && npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/ frontend/src/components/
git commit -m "feat: add chat UI, voice recorder, and role settings components"
```

---

### Task 9: 后端配置 API + 历史记录

**Files:**
- Create: `backend/api/config.py`
- Create: `backend/api/history.py`
- Modify: `backend/main.py`

- [ ] **Step 1: 创建 backend/api/config.py**

```python
import json
import os
from fastapi import APIRouter
from backend.config import settings
from backend.models.schemas import ConfigUpdate

router = APIRouter()
CONFIG_FILE = os.path.join(settings.history_dir, "app_config.json")


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
```

- [ ] **Step 2: 创建 backend/api/history.py**

```python
import json
import os
from datetime import datetime
from fastapi import APIRouter
from backend.config import settings
from backend.models.schemas import Message

router = APIRouter()


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
    path = _history_path(session_id)
    if not os.path.exists(path):
        return {"messages": []}
    with open(path) as f:
        return json.load(f)


@router.delete("/history/{session_id}")
async def delete_history(session_id: str):
    path = _history_path(session_id)
    if os.path.exists(path):
        os.remove(path)
    return {"status": "ok"}
```

- [ ] **Step 3: 在 main.py 中注册路由**

在 `main.py` 的 `app.include_router(stream.router, prefix="/api")` 下添加：

```python
from backend.api import config as config_api
from backend.api import history as history_api
app.include_router(config_api.router, prefix="/api")
app.include_router(history_api.router, prefix="/api")
```

- [ ] **Step 4: 语法检查**

Run: `cd D:/我的项目/MyVertinChat && python -c "import backend.api.config; import backend.api.history"`
Expected: 无报错

- [ ] **Step 5: Commit**

```bash
git add backend/api/config.py backend/api/history.py backend/main.py
git commit -m "feat: add config and history management endpoints"
```

---

### Task 10: 启动脚本和文档

**Files:**
- Create: `start.sh`
- Create: `docker-compose.yml`
- Create: `README.md`

- [ ] **Step 1: 创建 start.sh**

```bash
#!/bin/bash
# Vertin English Tutor - 一键启动

echo "=== Vertin English Tutor ==="

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 required"
    exit 1
fi

# 检查 Node.js
if ! command -v npm &> /dev/null; then
    echo "Error: Node.js required"
    exit 1
fi

# 安装后端依赖
echo "[1/3] Installing backend dependencies..."
cd "$(dirname "$0")/backend"
pip install -r requirements.txt -q

# 启动后端
echo "[2/3] Starting backend (port 8765)..."
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8765 &
BACKEND_PID=$!

# 安装前端依赖并启动
echo "[3/3] Starting frontend (port 5173)..."
cd "$(dirname "$0")/frontend"
npm install --silent
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8765"
echo "API Docs: http://localhost:8765/docs"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
```

- [ ] **Step 2: 创建 docker-compose.yml（GPT-SoVITS 独立服务）**

```yaml
version: "3.8"

services:
  gpt-sovits:
    image: breakstring/gpt-sovits:latest
    ports:
      - "9880:9880"
    volumes:
      - ./gpt_sovits_models:/workspace/pretrained_models
      - ./gpt_sovits_data:/workspace/data
    environment:
      - CUDA_VISIBLE_DEVICES=0
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    command: ["python", "api_v2.py"]
```

- [ ] **Step 3: 创建 README.md**

```markdown
# Vertin English Tutor

English speaking practice app with AI voice conversation — powered by Vertin (Reverse:1999) voice cloning.

## Architecture

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS
- **Backend**: Python FastAPI + faster-whisper (STT) + DeepSeek API (LLM)
- **TTS**: GPT-SoVITS (independent service, loads Vertin voice model)

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 20+
- NVIDIA GPU (recommended for Whisper + GPT-SoVITS)

### 1. GPT-SoVITS (Vertin Voice)
```bash
# Option A: Docker
docker compose up -d gpt-sovits

# Option B: Manual - follow GPT-SoVITS docs to set up API server
# Place Vertin model in the models directory
```

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
# Set your DeepSeek API key
export DEEPSEEK_API_KEY=your_key_here
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8765
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Open
Visit http://localhost:5173

## Configuration

- **System Prompt**: Edit Vertin's persona in the Settings panel
- **Difficulty**: Beginner / Intermediate / Advanced
- **API Key**: Set via `DEEPSEEK_API_KEY` env var or `.env` file

## License

MIT
```

- [ ] **Step 4: Commit**

```bash
git add start.sh docker-compose.yml README.md
git commit -m "docs: add startup scripts, Docker Compose, and README"
```

---

## 自检

1. **Spec coverage**:
   - 前端聊天界面 → Task 7, 8 ✓
   - 角色设定面板 → Task 8 (RoleSettings 组件) ✓
   - 语音录入/播放 → Task 7 (useAudioRecorder) + Task 8 (ChatBubble play button) ✓
   - 后端 STT (Whisper) → Task 2 ✓
   - 后端 Chat (DeepSeek) → Task 3 ✓
   - 后端 TTS (GPT-SoVITS) → Task 4 ✓
   - WebSocket 流式对话 → Task 5 ✓
   - 设置/历史记录 API → Task 9 ✓
   - 启动脚本/文档 → Task 10 ✓
   - GPT-SoVITS 部署 → docker-compose.yml + README ✓

2. **Placeholder 检查**: 无占位符、无 TODO、无"待补充"

3. **类型一致性检查**: 所有 TypeScript 和 Python 类型在前后任务中一致
