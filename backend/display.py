# display.py — TFT display (real on Pi, mock on laptop)

import threading
import time

_mock_mode = False

try:
    import RPi.GPIO as GPIO
    import st7735
    from PIL import Image, ImageDraw, ImageFont
    print("[Display] Real ST7735 display initialized")
except ImportError:
    _mock_mode = True
    print("[Display] Mock mode — display output goes to terminal")

_state = "idle"
_running = False
_thread = None


def _mock_loop():
    last_printed = None
    while _running:
        if _state != last_printed:
            if _state == "idle":
                print("[Display] Showing: starfield + orbs animation (IDLE)")
            elif _state == "break":
                print("[Display] Showing: FLASHING RED — TAKE A BREAK")
            last_printed = _state
        time.sleep(2)


def _real_loop():
    disp = st7735.ST7735(
        port=0, cs=st7735.BG_SPI_CS_FRONT,
        dc=9, backlight=19, rotation=270
    )
    disp.begin()
    width, height = disp.width, disp.height

    import random
    import math
    stars = [(random.randint(0, width), random.randint(0, height),
              random.uniform(0.5, 3.0)) for _ in range(60)]
    orbs = []
    for _ in range(5):
        orbs.append({
            "x": random.uniform(0, width),
            "y": random.uniform(0, height),
            "r": random.randint(8, 18),
            "dx": random.uniform(-1, 1),
            "dy": random.uniform(-0.5, 0.5),
            "color": (
                random.randint(80, 255),
                random.randint(80, 255),
                random.randint(80, 255)
            )
        })

    frame = 0
    flash = False
    while _running:
        img = Image.new("RGB", (width, height), (0, 0, 0))
        draw = ImageDraw.Draw(img)

        if _state == "idle":
            for i, (sx, sy, speed) in enumerate(stars):
                brightness = int(128 + 127 * math.sin(frame * 0.05 + i))
                draw.ellipse(
                    [sx - 1, sy - 1, sx + 1, sy + 1],
                    fill=(brightness, brightness, brightness)
                )
            for orb in orbs:
                orb["x"] = (orb["x"] + orb["dx"]) % width
                orb["y"] = (orb["y"] + orb["dy"]) % height
                x, y, r = int(orb["x"]), int(orb["y"]), orb["r"]
                draw.ellipse([x - r, y - r, x + r, y + r], fill=orb["color"])

        elif _state == "break":
            flash = not flash
            bg = (220, 20, 20) if flash else (80, 0, 0)
            draw.rectangle([0, 0, width, height], fill=bg)
            try:
                font = ImageFont.truetype(
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
            except Exception:
                font = ImageFont.load_default()
            draw.multiline_text((width // 2, height // 2), "TAKE A\nBREAK",
                                 font=font, fill=(255, 255, 255),
                                 anchor="mm", align="center")

        disp.display(img)
        frame += 1
        time.sleep(0.05)


def set_state(new_state):
    global _state
    _state = new_state


def start():
    global _running, _thread
    _running = True
    target = _mock_loop if _mock_mode else _real_loop
    _thread = threading.Thread(target=target, daemon=True)
    _thread.start()


def stop():
    global _running
    _running = False