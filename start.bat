@echo off
title Telegram AI Bot
echo ============================================================
echo   Khoi dong Telegram AI Bot (Google Gemini)
echo ============================================================
cd /d "%~dp0"
if not exist ".env" (
    echo [THONG BAO] Chua tim thay file .env! Dang tao tu .env.example...
    copy .env.example .env
    echo [!] Vui long mo file .env va dien TELEGRAM_BOT_TOKEN cung nhu GEMINI_API_KEY truoc khi chay.
    pause
    exit /b 1
)
call npm.cmd start
pause
