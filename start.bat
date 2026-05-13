@echo off
title Vertin English Tutor
echo.
echo ========================================
echo    Vertin English Tutor
echo ========================================
echo.
echo [1/3] Starting Vertin voice service...
start "GPT-SoVITS" /min cmd /c "%~dp0start_tts.bat"
echo   Waiting 30s for model to load...
ping 127.0.0.1 -n 30 >nul

echo [2/3] Starting backend...
start "Backend" /min cmd /c "cd /d %~dp0 && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8765"
ping 127.0.0.1 -n 3 >nul

echo [3/3] Starting frontend...
start "Frontend" /min cmd /c "cd /d %~dp0frontend && npm run dev"
ping 127.0.0.1 -n 5 >nul

echo.
echo All services started!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8765
pause
