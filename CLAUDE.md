# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vertin English Tutor — an English speaking practice web app. User speaks English via mic, speech is transcribed (Whisper STT), sent to DeepSeek API for AI response as Vertin (Reverse:1999 character), then synthesized to speech via Fish Audio API with Vertin voice cloning.

**Pipeline:** User voice → STT (Whisper) → LLM (DeepSeek) → TTS (Fish Audio) → Play audio

## Quick Start

```bash
# 1. Start backend (separate terminal)
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8765

# 2. Start frontend (separate terminal)
cd frontend && npm run dev

# Or use one-click:
.\start.bat
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8765
- API docs: http://localhost:8765/docs

## Architecture

```
frontend/          React 19 + Vite + TypeScript + Tailwind CSS
  src/
    api.ts              HTTP API client (STT, Chat, TTS)
    types.ts            Message, AppConfig, WSIncoming types
    hooks/
      useAudioRecorder.ts   MediaRecorder wrapper
      useWebSocket.ts       WebSocket client for streaming
    pages/
      ChatPage.tsx          Main chat UI (recording → STT → LLM → TTS cycle)
    components/
      ChatBubble.tsx        Message bubble with play button
      VoiceRecorder.tsx     Circular record button
      RoleSettings.tsx      System prompt editor + difficulty selector

backend/           Python FastAPI
  main.py               App entry, CORS, router registration
  config.py             Pydantic Settings (env-driven)
  api/
    stt.py              POST /api/stt
    tts.py              POST /api/tts, GET /api/audio/{file}, GET /api/tts/logs
    chat.py             POST /api/chat
    stream.py           WebSocket /api/chat/stream
    config.py           GET/PUT /api/config
    history.py          GET/DELETE /api/history
  services/
    whisper_service.py      faster-whisper singleton, GPU transcoding
    llm_service.py          LLM provider (DeepSeek or Gemini/Vertex AI), Vertin system prompt
    tts_service.py          GPT-SoVITS HTTP client, sacrificial prefix, audio caching
  models/
    schemas.py          Pydantic request/response models

GPT-SoVITS/         Fork of GPT-SoVITS (upstream: RVC-Boss/GPT-SoVITS)
                     Vertin model: GPT_SoVITS/pretrained_models/vertin/
```

## External Services

| Service | Endpoint | Purpose |
|---------|----------|---------|
| Fish Audio API | https://api.fish.audio/v1/tts | TTS voice synthesis (Vertin voice clone, reference_id: 3ffe666d...) |
| DeepSeek API | https://api.deepseek.com/v1 | LLM chat (deepseek-chat / deepseek-v4-flash) |
| Vertex AI (Gemini) | us-central1 (ADC auth) | LLM chat (gemini-2.5-flash), uses GCP $300 credit |
| Whisper | local GPU (CUDA) | STT transcription (medium model) |

## Key Config (.env)

```
# LLM provider (deepseek | gemini)
LLM_PROVIDER=deepseek

DEEPSEEK_API_KEY=sk-...        # Required for DeepSeek
DEEPSEEK_MODEL=deepseek-v4-flash

# Gemini (Vertex AI) — uses GCP $300 credit via ADC
# GEMINI_MODEL=gemini-2.5-flash
# GOOGLE_CLOUD_PROJECT=general-project-41306
# GOOGLE_CLOUD_LOCATION=us-central1

# Fish Audio TTS (voice cloning)
FISH_AUDIO_API_KEY=fsk-...
FISH_AUDIO_REFERENCE_ID=3ffe...   # Vertin voice model ID

WHISPER_MODEL=medium            # or large-v3
WHISPER_DEVICE=cuda
```

## Development

### Backend

- No test suite exists
- No type checking setup (runtime Python)
- `backend/api/` — FastAPI routers (thin, no business logic)
- `backend/services/` — Business logic + model wrappers (singleton pattern for ML models)

### Frontend

```bash
cd frontend
npm run dev           # Dev server on :5173
npx tsc --noEmit      # Type check
npm run build         # Production build
```

### TTS

- Fish Audio API (S2-Pro model) with Vertin voice cloning
- Reference audio: `GPT-SoVITS/e1.wav` (uploaded to Fish Audio as voice model `3ffe666d...`)
- API pricing: ~$15/million characters (pay-as-you-go)
- Latency: ~3-5s per request for typical conversation responses

### GPU Memory

- Whisper medium: ~2GB VRAM
- TTS runs on Fish Audio cloud (no local GPU needed for TTS)
- Total: ~2GB VRAM required

### Serving Static Files

Frontend dev server proxies `/api` and `/audio` to `localhost:8765`. The TTS service saves WAV files to `backend/audio_cache/` and serves them via `GET /api/audio/{file_id}.wav`.

## Repo Structure Notes

- `docs/superpowers/` contains design spec and implementation plan (Chinese)
- `GPT-SoVITS/` is a legacy fork — no longer used for TTS (replaced by Fish Audio API), kept for reference audio `e1.wav`
- Default Vertin reference audio: `e1.wav` (uploaded to Fish Audio)
- TTS logs: `backend/logs/tts_log.jsonl`
