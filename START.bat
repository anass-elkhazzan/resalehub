@echo off
title ResaleHub
echo.
echo  ╔══════════════════════════════════════╗
echo  ║         Starting ResaleHub...        ║
echo  ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  ERROR: Node.js is not installed.
    echo  Download it from: https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo  Installing dependencies...
    npm install
    echo.
)

echo  Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo  Running at http://localhost:3000
echo  Press Ctrl+C to stop.
echo.
node server.js
pause
