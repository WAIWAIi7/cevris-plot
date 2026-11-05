@echo off
setlocal
set "PSModulePath="
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\register-dsh.ps1"
exit /b %ERRORLEVEL%
