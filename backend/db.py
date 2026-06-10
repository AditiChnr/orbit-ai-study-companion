# db.py — MongoDB connection with local JSON fallback

import os
import json
from datetime import datetime

MONGO_URI = os.environ.get("MONGO_URI", "")
DB_NAME = "smartstudy"
FALLBACK_FILE = os.path.join(os.path.dirname(__file__), "fallback.json")

client = None
db = None


def init_db():
    global client, db
    try:
        from pymongo import MongoClient
        client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            tlsAllowInvalidCertificates=True
        )
        client.server_info()
        db = client[DB_NAME]
        print("[DB] Connected to MongoDB Atlas")
    except Exception as e:
        print(f"[DB] MongoDB unavailable ({e}), using local JSON fallback")
        db = None


def get_db():
    return db


def _load_fallback():
    if os.path.exists(FALLBACK_FILE):
        with open(FALLBACK_FILE, "r") as f:
            return json.load(f)
    return {"sessions": [], "attendance": []}


def _save_fallback(data):
    with open(FALLBACK_FILE, "w") as f:
        json.dump(data, f, indent=2)


def save_session(date_str, study_secs, sleep_secs, inactive_secs):
    doc = {
        "date": date_str,
        "study": study_secs,
        "sleep": sleep_secs,
        "inactive": inactive_secs,
        "updated": datetime.utcnow().isoformat()
    }
    if db is not None:
        db.sessions.update_one({"date": date_str}, {"$set": doc}, upsert=True)
    else:
        data = _load_fallback()
        existing = next((s for s in data["sessions"] if s["date"] == date_str), None)
        if existing:
            existing.update(doc)
        else:
            data["sessions"].append(doc)
        _save_fallback(data)


def load_today_session(date_str):
    if db is not None:
        doc = db.sessions.find_one({"date": date_str}, {"_id": 0})
        return doc
    else:
        data = _load_fallback()
        return next((s for s in data["sessions"] if s["date"] == date_str), None)


def load_sessions_range(days=7):
    if db is not None:
        docs = list(db.sessions.find({}, {"_id": 0}).sort("date", -1).limit(days))
        return docs
    else:
        data = _load_fallback()
        sessions = sorted(data["sessions"], key=lambda x: x["date"], reverse=True)
        return sessions[:days]


def load_attendance():
    if db is not None:
        docs = list(db.attendance.find({}, {"_id": 0}))
        return docs
    else:
        data = _load_fallback()
        return data.get("attendance", [])


def save_attendance(subjects):
    if db is not None:
        db.attendance.drop()
        if subjects:
            db.attendance.insert_many([dict(s) for s in subjects])
    else:
        data = _load_fallback()
        data["attendance"] = subjects
        _save_fallback(data)
# ── Reminder helpers ──────────────────────────────────────────────

def load_reminders():
    if db is not None:
        docs = list(db.reminders.find({}, {"_id": 0}))
        return docs
    else:
        data = _load_fallback()
        return data.get("reminders", [])

def save_reminder(reminder):
    if db is not None:
        db.reminders.insert_one({k: v for k, v in reminder.items() if k != "_id"})
    else:
        data = _load_fallback()
        if "reminders" not in data:
            data["reminders"] = []
        data["reminders"].append(reminder)
        _save_fallback(data)

def delete_reminder(reminder_id):
    if db is not None:
        db.reminders.delete_one({"id": reminder_id})
    else:
        data = _load_fallback()
        data["reminders"] = [r for r in data.get("reminders", []) if r.get("id") != reminder_id]
        _save_fallback(data)