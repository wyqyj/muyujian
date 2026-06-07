@echo off
chcp 65001 >nul 2>nul
cd /d "%~dp0"
title 暮雨笺 - 打包

set "PATH=C:\tools\node-v22.14.0-win-x64;%PATH%"

:: 检查 Node.js 是否可用
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

echo [1/2] 正在构建...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [错误] 构建失败，请检查代码
    pause
    exit /b 1
)

echo.
echo [2/2] 正在打包为 exe 安装包...
call npx electron-builder --win --publish never
if %errorlevel% neq 0 (
    echo.
    echo [错误] 打包失败
    pause
    exit /b 1
)

echo.
echo 打包完成！安装包在 release 文件夹中
explorer release
pause
