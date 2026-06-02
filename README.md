# ORBIT — AI Study Companion

> Sit down. Study. We handle the rest.

ORBIT is an intelligent, fully passive study monitoring system powered by Computer Vision and AI. It automatically tracks your study time, detects phone usage, manages Pomodoro breaks, and provides an AI assistant — all without any manual input.

---

## Features

- **Passive Study Detection** — Face detection automatically starts and stops your study timer
- **Phone Detection Alert** — YOLOv8 detects phone usage and triggers buzzer after 2 minutes
- **Smart Pomodoro System** — Customizable work/break timer with interactive popups
- **Sleep Detection** — Brightness analysis detects when you fall asleep at your desk
- **Sleep Reminder** — Set your wake time and get reminded to sleep 6 hours before
- **Attendance Tracker** — Visual calendar with present/absent marking and 75% warning
- **Daily Progress Graphs** — Stacked bar charts for last 7, 14, or 30 days
- **AI Study Assistant** — Upload PDFs and ask questions powered by Google Gemini
- **Reminders** — Add study reminders with date, time, and browser notifications
- **Emotion-Reactive Mascot** — Star mascot changes expression based on your study state
- **Cloud Sync** — MongoDB Atlas with local JSON fallback when offline
- **Raspberry Pi Support** — Physical buzzer, LED, and TFT display integration

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, Flask, Flask-CORS |
| Computer Vision | OpenCV Haar Cascade (face), YOLOv8 (phone) |
| AI Assistant | Google Gemini 2.0 Flash |
| Database | MongoDB Atlas + local JSON fallback |
| Frontend | React 18, Vite, Tailwind CSS |
| Charts | Recharts |
| Hardware | Raspberry Pi 4, Pi Camera V2, ST7735 TFT, GPIO Buzzer + LED |

---

## Project Structure
SmartStudy/
├── backend/
│   ├── app.py              # Main Flask server + all API routes
│   ├── camera.py           # Camera feed, face detection, phone detection
│   ├── session.py          # Study/sleep/away timers + Pomodoro logic
│   ├── attendance.py       # Attendance tracking logic
│   ├── db.py               # MongoDB Atlas + local JSON fallback
│   ├── display.py          # TFT display (real on Pi, mock on laptop)
│   ├── mock_gpio.py        # GPIO mock for laptop development
│   ├── seed_data.py        # Seed 30 days of realistic demo data
│   └── fallback.json       # Local database fallback
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Monitor.jsx       # Live camera + timers + mascot
│       │   ├── Attendance.jsx    # Calendar + attendance stats
│       │   ├── Graph.jsx         # Daily progress charts
│       │   ├── AIAssistant.jsx   # Gemini powered chat
│       │   ├── Reminders.jsx     # Reminders with notifications
│       │   ├── SleepReminder.jsx # Sleep tracking + wake time
│       │   └── Login.jsx         # Login page with ORBIT branding
│       ├── App.jsx               # Tab navigation + auth
│       └── index.css             # Global styles + dark theme
├── start.bat               # One-click launcher for Windows
└── README.md

---

## Setup

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- MongoDB Atlas account — free tier at https://cloud.mongodb.com
- Google Gemini API key — free at https://aistudio.google.com/app/apikey

### 1. Clone the repo

```cmd
git clone https://github.com/AditiChnr/orbit-ai-study-companion.git
cd orbit-ai-study-companion
```

### 2. Backend setup

```cmd
cd backend
py -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
```

### 3. Frontend setup

```cmd
cd frontend
npm install
```

### 4. Configure credentials

Open `start.bat` and replace the placeholders:

```bat
set GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
set MONGO_URI=mongodb+srv://username:PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority
```

- Get your free Gemini API key at https://aistudio.google.com/app/apikey
- Get your MongoDB URI from MongoDB Atlas → Connect → Drivers

### 5. Run the app

Double-click `start.bat` — launches backend, frontend, and opens browser automatically.

**Or run manually:**

Backend:
```cmd
cd backend
venv\Scripts\activate.bat
set GEMINI_API_KEY=your_key_here
set MONGO_URI=your_mongo_uri_here
py app.py
```

Frontend:
```cmd
cd frontend
npm run dev
```

Open http://localhost:5173

**Default login:**
Username: admin
Password: orbit123
---

## Seed Demo Data

Populate the graph with 30 days of realistic study data:

```cmd
cd backend
venv\Scripts\activate.bat
py seed_data.py
```

---

## How It Works

### Detection Pipeline

| Detection | Method | Trigger |
|-----------|--------|---------|
| Face | OpenCV Haar Cascade | Study timer starts |
| Phone | YOLOv8 COCO class 67 | Buzzer after 2 min |
| Sleep | Frame brightness < 30 for 30s | Sleep timer starts |
| Away | No face for 3+ seconds | Away timer starts |

### Three Background Threads

1. **Camera loop** — Captures frames at 25fps, runs detection
2. **Session tick loop** — Updates timers every second
3. **Autosave loop** — Saves to MongoDB every 30 seconds

### Smart Pomodoro Flow
Study for X minutes
↓
Popup: "Want 5 more minutes?"
YES → Extend by 5 min
NO  → Break timer starts
↓
Break ends → "Started studying?"
YES → Resume study timer
NO  → LOCK INNN popup
---

## Laptop vs Raspberry Pi

| Feature | Laptop | Raspberry Pi |
|---------|--------|-------------|
| Camera | Webcam via OpenCV | Pi Camera Module V2 |
| GPIO | Mock — prints to terminal | Real RPi.GPIO |
| Buzzer | Simulated | Physical on GPIO 17 |
| LED | Simulated | Physical on GPIO 27 |
| TFT Display | Mock — prints state | Real ST7735 128x160 |

Auto-detected on startup — no configuration needed.

---

## Raspberry Pi Setup

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3-pip python3-venv libopencv-dev -y
sudo raspi-config
# Interface Options → Camera → Enable → Reboot

cd /home/pi/SmartStudy/backend
python3 -m venv venv
source venv/bin/activate
pip install flask flask-cors pymongo dnspython opencv-python ultralytics pdfplumber Pillow numpy google-generativeai picamera2 RPi.GPIO st7735

export GEMINI_API_KEY=your_key
export MONGO_URI=your_connection_string
python3 app.py
```

Access from any device on the same network:
http://RASPBERRY_PI_IP:5000
---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | /video_feed | MJPEG live camera stream |
| GET | /stats | Current timers and detection status |
| GET | /graph_data?days=7 | Session history for charts |
| POST | /ask_ai | Send question to Gemini AI |
| POST | /extract_pdf | Extract text from PDF or TXT |
| GET | /att/data | All subjects and attendance records |
| POST | /att/add | Add new subject |
| POST | /att/remove | Remove subject |
| POST | /att/toggle | Cycle day between P / A / unmarked |
| GET | /att/stats/name | Get attendance percentage |
| POST | /set_pomodoro | Update Pomodoro work duration |
| POST | /sleep/start | Activate manual sleep mode |
| POST | /sleep/stop | Deactivate sleep mode |
| POST | /sleep/set_wake | Set wake-up time for reminder |
| GET | /reminders | Get all reminders |
| POST | /reminders/add | Add new reminder |
| POST | /reminders/done | Mark reminder as done |
| POST | /reminders/delete | Delete reminder |
| POST | /display/idle | Set TFT to starfield animation |
| POST | /display/break | Set TFT to break screen |

---

## Challenges and Solutions

| Challenge | Solution |
|-----------|----------|
| Phone detection flickering | Require 8 consecutive frames before triggering |
| False inactive from hand covering face | 3-second grace period before switching status |
| Sleep vs dark room | Require 30 seconds of sustained low brightness |
| Timer lost on restart | Load today's session from MongoDB on startup |
| MongoDB SSL on Windows | tlsAllowInvalidCertificates=True + JSON fallback |
| Cross-platform GPIO | Auto-detect environment, use mock GPIO on laptop |

---

## Future Scope

- Google OAuth for multi-user support
- Face recognition to identify specific registered user
- Mobile responsive layout and dedicated app
- Subject-wise study time tracking
- Emotion recognition for adaptive mascot feedback
- University portal attendance sync
- Animated slot machine style timer display
- Weekly email summary reports

---

## License

MIT License — free to use, modify, and distribute.

---

Made with by Aditi | ORBIT AI Study Companion <3
