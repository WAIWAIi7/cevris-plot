@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install.ps1" -Launch
set "CEVRIS_EXIT_CODE=%ERRORLEVEL%"
if not "%CEVRIS_EXIT_CODE%"=="0" pause
exit /b %CEVRIS_EXIT_CODE%
