@echo off
title Vertin English Tutor

echo ========================================
echo    Vertin English Tutor - One Click Start
echo ========================================
echo.

REM Get script directory
set "PROJECT_DIR=%~dp0"

REM Step 1: GPT-SoVITS (Vertin Voice)
echo [1/3] Starting Vertin voice service (GPT-SoVITS)...
start "GPT-SoVITS" /min cmd /c "cd /d "%PROJECT_DIR%GPT-SoVITS" && python api.py -s "GPT_SoVITS/pretrained_models/vertin/Vertin_e2_s154_l32.pth" -g "GPT_SoVITS/pretrained_models/vertin/Vertin-e10.ckpt" -d cuda -p 9880 -hp -dr e1.wav -dt "Are you still allow a point of contact for the Foundation, Madam Z?" -dl en"
echo   Model: Vertin V4 | GPU: Half Precision
echo   Waiting 30s for model to load...
ping 127.0.0.1 -n 30 >nul

REM Step 2: Backend FastAPI
echo [2/3] Starting backend server...
start "Backend" /min cmd /c "cd /d "%PROJECT_DIR%" && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8765"
ping 127.0.0.1 -n 3 >nul

REM Step 3: Frontend
echo [3/3] Starting frontend...
start "Frontend" /min cmd /c "cd /d "%PROJECT_DIR%frontend" && npm run dev"
ping 127.0.0.1 -n 5 >nul

echo.
echo ========================================
echo  All services started!
echo.
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:8765
echo  API Docs: http://localhost:8765/docs
echo  TTS:      http://localhost:9880
echo.
echo  First time: create .env file with:
echo  DEEPSEEK_API_KEY=sk-your-key-here
echo.
echo  Close this window to stop all services
echo ========================================
echo.
pause
