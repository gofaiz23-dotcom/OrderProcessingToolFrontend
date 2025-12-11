@echo off
REM This script starts the server in the background
title Order Processing Tool - Server

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    exit /b 1
)

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    call npm install
)

REM Start the dev server in a minimized window (keep it running)
start /min "" cmd /k "npm run dev"

exit /b 0

