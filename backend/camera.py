# camera.py — Camera feed, face detection, phone detection

import cv2
import threading
import time
import numpy as np
from pathlib import Path

_use_pi_camera = False
try:
    from picamera2 import Picamera2
    _use_pi_camera = True
    print("[Camera] Using Picamera2 (Pi)")
except ImportError:
    print("[Camera] Using OpenCV webcam (laptop)")

_yolo        = None
YOLO_WEIGHTS = Path(__file__).parent / "models" / "yolov8n.pt"


def _load_yolo():
    global _yolo
    try:
        from ultralytics import YOLO
        _yolo = YOLO(str(YOLO_WEIGHTS))
        print("[Camera] YOLOv8 model loaded")
    except Exception as e:
        print(f"[Camera] YOLOv8 not available: {e}")


_load_yolo()

_face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

_lock          = threading.Lock()
_frame_jpg     = None
_face_present  = False
_phone_present = False
_brightness    = 255.0


def _process_frame(frame_bgr):
    global _face_present, _phone_present, _brightness

    gray       = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))

    faces      = _face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
    )
    face_found = len(faces) > 0
    for (x, y, w, h) in faces:
        cv2.rectangle(frame_bgr, (x, y), (x + w, y + h), (0, 255, 0), 2)

    phone_found = False
    if _yolo is not None:
        try:
            results = _yolo(frame_bgr, verbose=False, conf=0.4)
            for r in results:
                for box in r.boxes:
                    cls = int(box.cls[0])
                    if cls == 67:
                        phone_found = True
                        bx1, by1, bx2, by2 = map(int, box.xyxy[0])
                        cv2.rectangle(frame_bgr, (bx1, by1), (bx2, by2), (0, 0, 255), 2)
                        cv2.putText(frame_bgr, "Phone", (bx1, by1 - 6),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
        except Exception:
            pass

    with _lock:
        _face_present  = face_found
        _phone_present = phone_found
        _brightness    = brightness

    return frame_bgr


def _capture_loop():
    global _frame_jpg

    if _use_pi_camera:
        cam = _open_picamera()
        while True:
            frame_rgb = cam.capture_array()
            frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
            processed = _process_frame(frame_bgr)
            _, jpg = cv2.imencode(".jpg", processed, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            with _lock:
                _frame_jpg = jpg.tobytes()
    else:
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        while True:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.1)
                continue
            processed = _process_frame(frame)
            _, jpg = cv2.imencode(".jpg", processed, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            with _lock:
                _frame_jpg = jpg.tobytes()


def _open_picamera():
    cam    = Picamera2()
    config = cam.create_preview_configuration(
        main={"size": (640, 480), "format": "RGB888"}
    )
    cam.configure(config)
    cam.start()
    return cam


def _tick_loop():
    from session import tick
    while True:
        with _lock:
            f = _face_present
            p = _phone_present
            b = _brightness
        tick(f, p, b)
        time.sleep(1)


def start():
    threading.Thread(target=_capture_loop, daemon=True).start()
    threading.Thread(target=_tick_loop,    daemon=True).start()
    print("[Camera] Capture and tick threads started")


def get_frame_jpg():
    with _lock:
        return _frame_jpg


def get_detections():
    with _lock:
        return {
            "face":       _face_present,
            "phone":      _phone_present,
            "brightness": round(_brightness, 1)
        }