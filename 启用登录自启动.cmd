@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\login-startup.ps1" -Action Enable
if errorlevel 1 (
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch.ps1" -SkipBrowser
if errorlevel 1 pause
