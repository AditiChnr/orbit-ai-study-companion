# app.py — Main Flask server

import os
import time
import random
from datetime import datetime, timedelta
from flask import Flask, Response, request, jsonify, send_from_directory
from flask_cors import CORS

import db as database
import camera
import session
import attendance as att_module
import display

app = Flask(__name__, static_folder="dist", static_url_path="")
CORS(app)

# Initialise subsystems — each wrapped so one failure can't kill the server
database.init_db()

try:
    camera.start()
    print("[App] Camera started OK")
except Exception as _cam_err:
    print(f"[App] WARNING: Camera failed to start: {_cam_err}")
    print("[App]   Backend will still run. Check camera connection.")

try:
    display.start()
    print("[App] Display started OK")
except Exception as _disp_err:
    print(f"[App] WARNING: Display failed to start: {_disp_err}")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")


@app.route("/")
def index():
    dist = os.path.join(os.path.dirname(__file__), "dist")
    if os.path.exists(dist):
        return send_from_directory(dist, "index.html")
    return "<h2>Flask running. Build React first.</h2>", 200


@app.route("/<path:path>")
def static_proxy(path):
    dist = os.path.join(os.path.dirname(__file__), "dist")
    full = os.path.join(dist, path)
    if os.path.exists(full):
        return send_from_directory(dist, path)
    return send_from_directory(dist, "index.html")


def _generate_frames():
    while True:
        try:
            jpg = camera.get_frame_jpg()
            if jpg:
                yield (b"--frame\r\n"
                       b"Content-Type: image/jpeg\r\n\r\n" + jpg + b"\r\n")
        except Exception:
            pass
        time.sleep(0.04)


@app.route("/video_feed")
def video_feed():
    return Response(
        _generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/stats")
def stats():
    try:
        s = session.get_stats()
        d = camera.get_detections()
        s.update(d)
        return jsonify(s)
    except Exception as e:
        return jsonify({"error": str(e), "face": False, "phone": False, "brightness": 0})


@app.route("/graph_data")
def graph_data():
    days = int(request.args.get("days", 7))
    docs = database.load_sessions_range(days)
    today = datetime.now().date()

    if not docs:
        demo = []
        for i in range(days):
            d = today - timedelta(days=(days - 1 - i))
            demo.append({
                "date":     d.strftime("%Y-%m-%d"),
                "study":    round(random.uniform(1.5, 6.0), 2),
                "sleep":    round(random.uniform(0.0, 1.5), 2),
                "inactive": round(random.uniform(0.2, 2.0), 2),
            })
        return jsonify(demo)

    real_by_date = {}
    for d in docs:
        real_by_date[d.get("date", "")] = d

    def _to_hours(val):
        v = float(val or 0)
        return round(v / 3600, 2) if v > 24 else round(v, 2)

    result = []
    for i in range(days):
        d = today - timedelta(days=(days - 1 - i))
        date_str = d.strftime("%Y-%m-%d")
        if date_str in real_by_date:
            doc = real_by_date[date_str]
            result.append({
                "date":     date_str,
                "study":    _to_hours(doc.get("study", 0)),
                "sleep":    _to_hours(doc.get("sleep", 0)),
                "inactive": _to_hours(doc.get("inactive", doc.get("away", 0))),
            })
        else:
            result.append({"date": date_str, "study": 0, "sleep": 0, "inactive": 0})
    return jsonify(result)


# Alias so both /graph_data and /api/graph work
@app.route("/api/graph")
def api_graph():
    return graph_data()


@app.route("/ask_ai", methods=["POST"])
def ask_ai():
    data     = request.get_json()
    question = data.get("question", "").strip()
    context  = data.get("context",  "").strip()
    history  = data.get("history",  [])

    if not question:
        return jsonify({"error": "No question provided"}), 400
    if not GEMINI_API_KEY:
        return jsonify({"error": "GEMINI_API_KEY not set on server"}), 500

    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)

        system_prompt = (
            "You are Orbit, a helpful AI study assistant. "
            "Answer questions clearly and concisely. "
            "If the user has uploaded source material, use it to answer."
        )
        if context:
            system_prompt += f"\n\n--- UPLOADED SOURCES ---\n{context[:12000]}\n--- END SOURCES ---"

        model_names = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-flash-latest"]
        model    = None
        last_err = None
        for model_name in model_names:
            try:
                model = genai.GenerativeModel(model_name=model_name, system_instruction=system_prompt)
                print(f"[AI] Using model: {model_name}")
                break
            except Exception as e:
                last_err = e
                continue

        if model is None:
            return jsonify({"error": f"No working Gemini model found: {last_err}"}), 500

        gemini_history = []
        for h in history[-10:]:
            role = "user" if h["role"] == "user" else "model"
            gemini_history.append({"role": role, "parts": [{"text": h["content"]}]})

        chat     = model.start_chat(history=gemini_history)
        response = chat.send_message(question)
        return jsonify({"answer": response.text})

    except Exception as e:
        print(f"[AI] Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/extract_pdf", methods=["POST"])
def extract_pdf():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    f        = request.files["file"]
    filename = f.filename.lower()
    try:
        if filename.endswith(".pdf"):
            import pdfplumber, io
            text_parts = []
            with pdfplumber.open(io.BytesIO(f.read())) as pdf:
                for page in pdf.pages:
                    t = page.extract_text()
                    if t:
                        text_parts.append(t)
            text = "\n\n".join(text_parts)
        elif filename.endswith(".txt"):
            text = f.read().decode("utf-8", errors="ignore")
        else:
            return jsonify({"error": "Only PDF and TXT supported"}), 400
        return jsonify({"text": text[:50000]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/att/data")
def att_data():
    return jsonify(att_module.get_all())

@app.route("/att/add", methods=["POST"])
def att_add():
    data = request.get_json()
    return jsonify(att_module.add_subject(data.get("name", "")))

@app.route("/att/remove", methods=["POST"])
def att_remove():
    data = request.get_json()
    return jsonify(att_module.remove_subject(data.get("name", "")))

@app.route("/att/toggle", methods=["POST"])
def att_toggle():
    data = request.get_json()
    return jsonify(att_module.toggle_day(data.get("name", ""), data.get("date", "")))

@app.route("/att/stats/<name>")
def att_stats(name):
    return jsonify(att_module.get_stats(name))


@app.route("/display/<state>", methods=["POST"])
def set_display(state):
    if state in ("idle", "break"):
        display.set_state(state)
        return jsonify({"ok": True})
    return jsonify({"error": "Invalid state"}), 400


@app.route("/reminders", methods=["GET"])
def get_reminders():
    from db import load_reminders
    return jsonify(load_reminders())

@app.route("/reminders/add", methods=["POST"])
def add_reminder():
    import uuid
    from db import save_reminder
    data = request.get_json()
    reminder = {
        "id":       str(uuid.uuid4()),
        "title":    data.get("title", "").strip(),
        "note":     data.get("note", "").strip(),
        "datetime": data.get("datetime", ""),
        "done":     False,
        "created":  datetime.utcnow().isoformat()
    }
    if not reminder["title"]:
        return jsonify({"error": "Title required"}), 400
    save_reminder(reminder)
    return jsonify({"ok": True, "reminder": reminder})

@app.route("/reminders/delete", methods=["POST"])
def delete_reminder_route():
    from db import delete_reminder
    data = request.get_json()
    delete_reminder(data.get("id", ""))
    return jsonify({"ok": True})

@app.route("/reminders/done", methods=["POST"])
def mark_reminder_done():
    from db import _load_fallback, _save_fallback
    data = request.get_json()
    rid  = data.get("id", "")
    if database.get_db() is not None:
        database.get_db().reminders.update_one({"id": rid}, {"$set": {"done": True}})
    else:
        fb = _load_fallback()
        for r in fb.get("reminders", []):
            if r.get("id") == rid:
                r["done"] = True
        _save_fallback(fb)
    return jsonify({"ok": True})


_pomodoro_work_secs = 25 * 60

@app.route("/set_pomodoro", methods=["POST"])
def set_pomodoro():
    global _pomodoro_work_secs
    data = request.get_json()
    mins = int(data.get("work_mins", 25))
    _pomodoro_work_secs = mins * 60
    session.set_pomodoro_duration(_pomodoro_work_secs)
    return jsonify({"ok": True})


_wake_time  = None
_sleep_mode = False

@app.route("/sleep/set_wake", methods=["POST"])
def set_wake_time():
    global _wake_time
    data = request.get_json()
    _wake_time = data.get("wake_time", "")
    print(f"[Sleep] Wake time set to {_wake_time}")
    return jsonify({"ok": True})

@app.route("/sleep/wake_time", methods=["GET"])
def get_wake_time():
    return jsonify({"wake_time": _wake_time or ""})

@app.route("/sleep/check", methods=["GET"])
def check_sleep_reminder():
    if not _wake_time:
        return jsonify({"remind": False})
    try:
        now  = datetime.now()
        h, m = map(int, _wake_time.split(":"))
        wake = now.replace(hour=h, minute=m, second=0, microsecond=0)
        if wake <= now:
            wake = wake + timedelta(days=1)
        diff_hours    = (wake - now).total_seconds() / 3600
        should_remind = 6.0 <= diff_hours <= 8.0
        return jsonify({"remind": should_remind, "hours_left": round(diff_hours, 1), "wake_time": _wake_time})
    except Exception as e:
        return jsonify({"remind": False, "error": str(e)})

@app.route("/sleep/start", methods=["POST"])
def start_sleep_mode():
    global _sleep_mode
    _sleep_mode = True
    session.set_sleep_mode(True)
    return jsonify({"ok": True})

@app.route("/sleep/stop", methods=["POST"])
def stop_sleep_mode():
    global _sleep_mode
    _sleep_mode = False
    session.set_sleep_mode(False)
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)