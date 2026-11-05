@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\login-startup.ps1" -Action Disable
pause
