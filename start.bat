@echo off
chcp 65001 >nul
title Vertin English Tutor

set PROJECT_DIR=D:\我的项目\MyVertinChat

echo ========================================
echo    Vertin English Tutor - 一键启动
echo ========================================
echo.

:: ===== 1. GPT-SoVITS (Vertin 语音服务) =====
echo [1/3] 启动 Vertin 语音服务 (GPT-SoVITS) ...
start "GPT-SoVITS" /min cmd /c "
    cd /d %PROJECT_DIR%\GPT-SoVITS
    python api.py -s GPT_SoVITS/pretrained_models/vertin/Vertin_e2_s154_l32.pth -g GPT_SoVITS/pretrained_models/vertin/Vertin-e10.ckpt -d cuda -p 9880 -hp -dr e1.wav -dt ^"Are you still allow a point of contact for the Foundation, Madam Z?^" -dl en
    pause
"
echo    等待语音服务加载中（约30秒）...
echo    语音模型: Vertin V4 ^| GPU: 半精度
ping 127.0.0.1 -n 30 >nul

:: ===== 2. 后端 FastAPI =====
echo [2/3] 启动后端服务 (FastAPI) ...
start "Backend" /min cmd /c "
    cd /d %PROJECT_DIR%
    python -m uvicorn backend.main:app --host 0.0.0.0 --port 8765
    pause
"
ping 127.0.0.1 -n 3 >nul

:: ===== 3. 前端 React =====
echo [3/3] 启动前端 (React) ...
start "Frontend" /min cmd /c "
    cd /d %PROJECT_DIR%\frontend
    npm run dev
    pause
"
ping 127.0.0.1 -n 5 >nul

:: ===== 检查启动状态 =====
echo.
echo ========================================
echo  所有服务已启动！
echo.
echo  前端界面:  http://localhost:5173
echo  后端 API:  http://localhost:8765
echo  API 文档:  http://localhost:8765/docs
echo  语音服务:  http://localhost:9880
echo.
echo  提示：首次启动请先配置 DeepSeek API Key
echo  在 .env 文件中设置 DEEPSEEK_API_KEY
echo.
echo  关闭所有服务请关闭本窗口
echo ========================================
echo.

:: 保持窗口打开
pause
