@echo off
chcp 65001 >nul 2>nul
title MuYuJian - Build

set "ELECTRON_RUN_AS_NODE="
set "ELECTRON_NO_ATTACH_CONSOLE="
set "PATH=C:\tools\node-v22.14.0-win-x64;%PATH%"

echo ========================================
echo       MuYuJian - Build Installer
echo ========================================
echo.

echo [INFO] Building frontend...
call npx vite build --config vite.config.ts
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed
    pause
    exit /b 1
)

echo [INFO] Compiling TypeScript...
call npx tsc -p tsconfig.main.json
if %errorlevel% neq 0 (
    echo [ERROR] TypeScript compile failed
    pause
    exit /b 1
)

echo [INFO] Packaging installer (this may take a few minutes)...
call npx electron-builder --win --publish never
if %errorlevel% neq 0 (
    echo [ERROR] Package failed
    pause
    exit /b 1
)

echo.
echo [OK] Done! Installer is in release folder
echo.
explorer release
pause
