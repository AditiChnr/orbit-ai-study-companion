# session.py — Study/Sleep/Away timers

import time
import threading
from datetime import datetime
from db import save_session, load_today_session

_lock = threading.Lock()

_today         = datetime.now().strftime("%Y-%m-%d")
_study_secs    = 0.0
_sleep_secs    = 0.0
_inactive_secs = 0.0
_status        = "INACTIVE"
_last_tick     = time.time()

_phone_start    = None
_phone_alert    = False
_pomodoro_bank  = 0.0
_pomodoro_alert = False
_pomodoro_duration = 25 * 60

# Sleep detection
_dark_since      = None
DARK_THRESHOLD   = 40
DARK_DURATION    = 3

# Face grace period
_face_lost_since = None
FACE_GRACE       = 3

# Phone stability
_phone_consecutive  = 0
PHONE_FRAMES_NEEDED = 8

# Manual sleep mode
_sleep_mode = False

_gpio       = None
_buzzer_pin = 18
_led_pin    = 22

# Display state tracking
_last_display_state = None


def _init_gpio():
    global _gpio
    try:
        import RPi.GPIO as GPIO
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(_buzzer_pin, GPIO.OUT)
        GPIO.setup(_led_pin,    GPIO.OUT)
        _gpio = GPIO
        print("[Session] Real GPIO initialized")
    except ImportError:
        import mock_gpio as mg
        _gpio = mg
        _gpio.setmode(_gpio.BCM)
        _gpio.setup(_buzzer_pin, _gpio.OUT)
        _gpio.setup(_led_pin,    _gpio.OUT)
        print("[Session] Mock GPIO initialized")


_init_gpio()


def _load_today():
    global _study_secs, _sleep_secs, _inactive_secs, _today
    _today = datetime.now().strftime("%Y-%m-%d")
    doc = load_today_session(_today)
    if doc:
        _study_secs    = float(doc.get("study",    0))
        _sleep_secs    = float(doc.get("sleep",    0))
        _inactive_secs = float(doc.get("inactive", 0))
        print(f"[Session] Loaded: study={_study_secs}s sleep={_sleep_secs}s inactive={_inactive_secs}s")
    else:
        print("[Session] No saved data for today, starting fresh")


_load_today()


def set_pomodoro_duration(secs: int):
    global _pomodoro_duration
    _pomodoro_duration = secs
    print(f"[Session] Pomodoro duration set to {secs}s ({secs//60} min)")


def set_sleep_mode(enabled: bool):
    global _sleep_mode
    _sleep_mode = enabled
    print(f"[Session] Sleep mode {'ON' if enabled else 'OFF'}")


def _update_display(new_state: str):
    global _last_display_state
    if new_state != _last_display_state:
        try:
            import display
            display.set_state(new_state)
            _last_display_state = new_state
        except Exception as e:
            print(f"[Session] Display update error: {e}")


def tick(face_present: bool, phone_present: bool, brightness: float):
    global _study_secs, _sleep_secs, _inactive_secs
    global _status, _last_tick, _today
    global _phone_start, _phone_alert
    global _pomodoro_bank, _pomodoro_alert
    global _dark_since, _face_lost_since
    global _phone_consecutive

    now     = time.time()
    elapsed = now - _last_tick
    _last_tick = now

    today = datetime.now().strftime("%Y-%m-%d")
    if today != _today:
        _today = today
        with _lock:
            _study_secs    = 0.0
            _inactive_secs = 0.0

    with _lock:

        if _sleep_mode:
            _status = "SLEEPING"
            _sleep_secs += elapsed
            _update_display("sleeping")
            return

        if phone_present:
            _phone_consecutive += 1
        else:
            _phone_consecutive = 0
        stable_phone = _phone_consecutive >= PHONE_FRAMES_NEEDED

        if brightness < DARK_THRESHOLD:
            if _dark_since is None:
                _dark_since = now
            dark_duration = now - _dark_since
        else:
            _dark_since   = None
            dark_duration = 0

        if dark_duration >= DARK_DURATION:
            _status = "SLEEPING"
            _sleep_secs += elapsed
            _face_lost_since = None
            _update_display("sleeping")

        elif face_present and stable_phone:
            _status = "INACTIVE"
            _inactive_secs  += elapsed
            _face_lost_since = None
            _update_display("phone")

        elif face_present and not stable_phone:
            _status = "STUDYING"
            _study_secs    += elapsed
            _pomodoro_bank += elapsed
            _face_lost_since = None
            _update_display("studying")

        else:
            if _face_lost_since is None:
                _face_lost_since = now
            _status = "INACTIVE"
            _inactive_secs += elapsed
            _update_display("idle")

        if _pomodoro_bank >= _pomodoro_duration:
            _pomodoro_alert = True
            _pomodoro_bank  = 0.0
            _buzz(0.3)
            _update_display("break")

        if stable_phone:
            if _phone_start is None:
                _phone_start = now
            elif now - _phone_start >= 2 * 60:
                _phone_alert = True
                _buzz(0.5)
        else:
            _phone_start = None
            _phone_alert = False


def _buzz(duration=0.2):
    if _gpio:
        try:
            _gpio.output(_buzzer_pin, _gpio.HIGH)
            time.sleep(duration)
            _gpio.output(_buzzer_pin, _gpio.LOW)
        except Exception:
            pass


def _autosave_loop():
    while True:
        time.sleep(30)
        with _lock:
            save_session(_today, int(_study_secs),
                         int(_sleep_secs), int(_inactive_secs))


threading.Thread(target=_autosave_loop, daemon=True).start()


def get_stats():
    global _pomodoro_alert, _phone_alert
    with _lock:
        pa = _pomodoro_alert
        ph = _phone_alert
        _pomodoro_alert = False
        return {
            "study":          int(_study_secs),
            "sleep":          int(_sleep_secs),
            "inactive":       int(_inactive_secs),
            "status":         _status,
            "pomodoro_alert": pa,
            "phone_alert":    ph,
            "sleep_mode":     _sleep_mode
        }
