@echo off
chcp 65001 >nul 2>nul
title MuYuJian

set "ELECTRON_RUN_AS_NODE="
set "ELECTRON_NO_ATTACH_CONSOLE="
set "PATH=C:\tools\node-v22.14.0-win-x64;%PATH%"

npx electron .
