@echo off
chcp 65001 >nul 2>nul
title 暮雨笺 - 创建快捷方式

echo [INFO] 正在创建桌面快捷方式...

set "CURRENT_DIR=%~dp0"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\cs.vbs"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\暮雨笺.lnk" >> "%TEMP%\cs.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\cs.vbs"
echo oLink.TargetPath = "%CURRENT_DIR%启动暮雨笺.bat" >> "%TEMP%\cs.vbs"
echo oLink.WorkingDirectory = "%CURRENT_DIR%" >> "%TEMP%\cs.vbs"
echo oLink.Description = "暮雨笺 - Markdown 笔记应用" >> "%TEMP%\cs.vbs"
echo oLink.WindowStyle = 7 >> "%TEMP%\cs.vbs"
echo oLink.Save >> "%TEMP%\cs.vbs"

cscript //nologo "%TEMP%\cs.vbs"
del "%TEMP%\cs.vbs"

echo [OK] 桌面快捷方式已创建
echo.
pause
