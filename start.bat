@echo off
title ORBIT - AI Study Companion

set "NODEPATH=C:\Program Files\nodejs"
set "PYPATH=C:\Users\deepa\AppData\Local\Programs\Python\Launcher"
set "PATH=%PATH%;%NODEPATH%;%PYPATH%"

echo Starting ORBIT Backend...
start "ORBIT Backend" cmd /k "cd /d C:\SmartStudy\backend && venv\Scripts\activate.bat && set GEMINI_API_KEY=AIzaSyDeS3AuFZXDzNvgEUoCMjgPvF3hsgUSSQ8 && py app.py"

echo Waiting for backend...
timeout /t 5 /nobreak > nul

echo Starting ORBIT Frontend...
start "ORBIT Frontend" cmd /k "set PATH=%PATH%;C:\Program Files\nodejs && cd /d C:\SmartStudy\frontend && npm run dev"

echo Opening browser...
timeout /t 4 /nobreak > nul
start http://localhost:5173

echo.
echo ORBIT is running at http://localhost:5173
echo.
pause