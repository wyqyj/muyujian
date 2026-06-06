@echo off
chcp 65001 >nul 2>nul
title Create Shortcut

set "PATH=C:\tools\node-v22.14.0-win-x64;%PATH%"

echo [INFO] Creating desktop shortcut...

set "CURRENT_DIR=%~dp0"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%TEMP%\cs.vbs"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\MuYuJian.lnk" >> "%TEMP%\cs.vbs"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%TEMP%\cs.vbs"
echo oLink.TargetPath = "%CURRENT_DIR%启动花笺.bat" >> "%TEMP%\cs.vbs"
echo oLink.WorkingDirectory = "%CURRENT_DIR%" >> "%TEMP%\cs.vbs"
echo oLink.Description = "MuYuJian Notes" >> "%TEMP%\cs.vbs"
echo oLink.WindowStyle = 7 >> "%TEMP%\cs.vbs"
echo oLink.Save >> "%TEMP%\cs.vbs"

cscript //nologo "%TEMP%\cs.vbs"
del "%TEMP%\cs.vbs"

echo [OK] Shortcut created on desktop
echo.
pause
