@echo off
title ORBIT - AI Study Companion
color 0A

set "GEMINI_API_KEY=AQ.Ab8RN6LrQLlc5FpUXl6idZJNNavhGid_vepbbTRvFHpf2OxJyg"
set "MONGO_URI=mongodb+srv://aditi_chnr:Mongo50telmemo@aditi.dpig68j.mongodb.net/?retryWrites=true&w=majority"
set "PATH=%PATH%;C:\Program Files\nodejs"

cd /d C:\SmartStudy\backend
call venv\Scripts\activate.bat

echo [1/4] Seeding test data...
py seed_data.py

echo [2/4] Starting ORBIT Backend...
start "ORBIT Backend" cmd /k "C:\SmartStudy\run_backend.bat"

echo [3/4] Waiting 12 seconds for backend + camera to load...
timeout /t 12 /nobreak > nul

echo [4/4] Starting ORBIT Frontend...
start "ORBIT Frontend" cmd /k "cd /d C:\SmartStudy\frontend && npm run dev"

timeout /t 6 /nobreak > nul
start http://localhost:5173

echo.
echo ORBIT is running at http://localhost:5173
echo.
pause