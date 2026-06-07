@echo off
chcp 65001 >nul 2>nul
cd /d "%~dp0"
title 暮雨笺 - 构建启动

:: 添加 Node.js 到 PATH
set "PATH=C:\tools\node-v22.14.0-win-x64;%PATH%"

:: 检查 Node.js 是否可用
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

:: 关闭已运行的暮雨笺进程
taskkill /F /IM electron.exe >nul 2>nul
timeout /t 1 /nobreak >nul

:: 重置欢迎便签（开发调试用，确保每次启动都能看到欢迎便签）
if exist "dist\data\config.json" (
    node -e "const fs=require('fs');const p='dist/data/config.json';try{const d=JSON.parse(fs.readFileSync(p,'utf-8'));delete d.initialized;fs.writeFileSync(p,JSON.stringify(d,null,2),'utf-8')}catch{}"
)
if exist "dist\data\notes.json" del /f /q "dist\data\notes.json"

echo [1/2] 正在构建...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [错误] 构建失败，请检查代码
    pause
    exit /b 1
)

echo.
echo [2/2] 正在启动暮雨笺...
echo.
npx electron .
