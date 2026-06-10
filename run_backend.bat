@echo off
cd /d C:\SmartStudy\backend
call venv\Scripts\activate.bat
set "GEMINI_API_KEY=AQ.Ab8RN6LrQLlc5FpUXl6idZJNNavhGid_vepbbTRvFHpf2OxJyg"
set "MONGO_URI=mongodb+srv://aditi_chnr:Mongo50telmemo@aditi.dpig68j.mongodb.net/?retryWrites=true&w=majority"
echo [ORBIT Backend] Starting Flask + Camera...
py app.py
pause