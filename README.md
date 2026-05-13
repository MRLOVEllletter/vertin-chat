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
