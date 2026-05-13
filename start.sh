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

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 安装后端依赖
echo "[1/3] Installing backend dependencies..."
cd "$PROJECT_DIR/backend"
pip install -r requirements.txt -q

# 启动后端
echo "[2/3] Starting backend (port 8765)..."
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8765 &
BACKEND_PID=$!

# 安装前端依赖并启动
echo "[3/3] Starting frontend (port 5173)..."
cd "$PROJECT_DIR/frontend"
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
