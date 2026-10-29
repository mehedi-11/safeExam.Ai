@echo off
title SafeExam.Ai - Stop Servers
cd /d "%~dp0"
cls
color 0C
echo ====================================================================
echo                   SafeExam.Ai - Stop Servers                        
echo ====================================================================
echo.
echo Stopping Backend (Port 5000) and Frontend (Port 5173)...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo.
echo [OK] All SafeExam.Ai servers have been stopped.
echo ====================================================================
echo.
pause
