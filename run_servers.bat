@echo off
title SafeExam.Ai - Server Launcher
cls
color 0B

echo ====================================================================
echo                   SafeExam.Ai - System Launcher                     
echo ====================================================================
echo.
echo   [1/2] Starting Backend Server (Node.js/Express on Port 5000)...
cd /d "%~dp0backend"
start "SafeExam.Ai - Backend (Port 5000)" cmd /k "title SafeExam.Ai Backend (Port 5000) && echo Starting Backend Server on http://localhost:5000... && npm start"

timeout /t 2 /nobreak >nul

echo   [2/2] Starting Frontend Server (Vite/React on Port 5173)...
cd /d "%~dp0frontend"
start "SafeExam.Ai - Frontend (Port 5173)" cmd /k "title SafeExam.Ai Frontend (Port 5173) && echo Starting Frontend Client on http://localhost:5173... && npm run dev"

cd /d "%~dp0"

echo.
echo ====================================================================
echo                 ALL SERVERS LAUNCHED SUCCESSFULLY!                  
echo ====================================================================
echo.
echo   Frontend Application (Student / Teacher / Admin):
echo   --^> http://localhost:5173
echo.
echo   Backend API Server:
echo   --^> http://localhost:5000
echo.
echo ====================================================================
echo   NOTE: Please keep the Backend and Frontend CMD windows open.
echo ====================================================================
echo.

choice /C YN /T 4 /D Y /M "Open Frontend in your default browser now? (Auto-opens in 4s)"
if errorlevel 2 goto keep_open
if errorlevel 1 start http://localhost:5173

:keep_open
echo.
echo SafeExam.Ai is running! Press any key to close this launcher window...
pause >nul
