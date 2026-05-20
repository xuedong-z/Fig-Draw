@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start_windows.ps1"
echo.
echo You can close this window after the browser opens.
echo To stop the app, double-click "Stop Scientific Figure Studio.bat".
pause
