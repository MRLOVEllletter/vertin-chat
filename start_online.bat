@echo off
title Vertin Online

echo [1/3] Building frontend for production...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo Frontend build failed!
    pause
    exit /b %errorlevel%
)
cd ..

echo [2/3] Starting backend...
start "Backend" /min cmd /c "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8765"
timeout /t 3 /nobreak >nul

echo.
echo ======================================================
echo  Your public URL: https://voice.westwind.ink
echo  Press Ctrl+C in this window to stop everything.
echo ======================================================
echo.

"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run vertin-voice

echo [%date% %time%] Tunnel exited! Restarting in 10 seconds...
timeout /t 10 /nobreak >nul
goto retry_tunnel
