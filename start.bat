@echo off
title Vertin English Tutor

echo ========================================
echo    Vertin English Tutor
echo ========================================
echo.

echo [1/3] Starting Vertin voice service (GPT-SoVITS)...
start "GPT-SoVITS" /min cmd /c "D:\我的项目\MyVertinChat\start_tts.bat"
echo   Model: Vertin V4 | GPU: Half Precision
echo   Waiting 30s for model to load...
ping 127.0.0.1 -n 30 >nul

echo [2/3] Starting backend server...
start "Backend" /min cmd /c "cd /d D:\我的项目\MyVertinChat && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8765"
ping 127.0.0.1 -n 3 >nul

echo [3/3] Starting frontend...
start "Frontend" /min cmd /c "cd /d D:\我的项目\MyVertinChat\frontend && npm run dev"
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
