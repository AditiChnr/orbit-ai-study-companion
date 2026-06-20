# display.py — TFT display + LEDs + Buzzer with mascot animations

import threading
import time
import os
import math
import random

_mock_mode = False
_BASE = os.path.dirname(__file__)

# ── Mascot image paths ────────────────────────────────────────────────────────
MASCOT = {
    "focused":  os.path.join(_BASE, "mascot-focused.png"),
    "dancing":  os.path.join(_BASE, "mascot-dancing.png"),
    "sleeping": os.path.join(_BASE, "mascot-sleeping.png"),
    "idle":     os.path.join(_BASE, "mascot-idle.png"),
    "phone":    os.path.join(_BASE, "mascot-phone.png"),
    "happy":    os.path.join(_BASE, "mascot-happy.png"),
}

try:
    import RPi.GPIO as GPIO
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)

    LED_GREEN  = 22
    LED_YELLOW = 3
    LED_RED    = 2
    LED_WHITE  = 4
    BUZZER     = 18

    for pin in [LED_GREEN, LED_YELLOW, LED_RED, LED_WHITE, BUZZER]:
        GPIO.setup(pin, GPIO.OUT)
        GPIO.output(pin, GPIO.LOW)

    import st7735
    from PIL import Image, ImageDraw, ImageFont
    print("[Display] Real GPIO + ST7735 initialized")

except ImportError:
    _mock_mode = True
    print("[Display] Mock mode — display output goes to terminal")

_state     = "idle"
_running   = False
_thread    = None


# ── LED helpers ───────────────────────────────────────────────────────────────
def _all_leds_off():
    if _mock_mode:
        return
    for pin in [LED_GREEN, LED_YELLOW, LED_RED, LED_WHITE]:
        GPIO.output(pin, GPIO.LOW)

def _set_leds_studying():
    if _mock_mode:
        return
    GPIO.output(LED_GREEN,  GPIO.HIGH)
    GPIO.output(LED_WHITE,  GPIO.HIGH)
    GPIO.output(LED_YELLOW, GPIO.LOW)
    GPIO.output(LED_RED,    GPIO.LOW)

def _set_leds_break():
    if _mock_mode:
        return
    GPIO.output(LED_RED,    GPIO.HIGH)
    GPIO.output(LED_YELLOW, GPIO.HIGH)
    GPIO.output(LED_GREEN,  GPIO.LOW)
    GPIO.output(LED_WHITE,  GPIO.LOW)

def _set_leds_away():
    if _mock_mode:
        return
    GPIO.output(LED_YELLOW, GPIO.HIGH)
    GPIO.output(LED_GREEN,  GPIO.LOW)
    GPIO.output(LED_RED,    GPIO.LOW)
    GPIO.output(LED_WHITE,  GPIO.LOW)

def _set_leds_sleeping():
    if _mock_mode:
        return
    GPIO.output(LED_WHITE,  GPIO.HIGH)
    GPIO.output(LED_GREEN,  GPIO.LOW)
    GPIO.output(LED_YELLOW, GPIO.LOW)
    GPIO.output(LED_RED,    GPIO.LOW)

def buzz(times=1, duration=0.1):
    if _mock_mode:
        print(f"[Display] BUZZ x{times}")
        return
    for _ in range(times):
        GPIO.output(BUZZER, GPIO.HIGH)
        time.sleep(duration)
        GPIO.output(BUZZER, GPIO.LOW)
        time.sleep(0.05)


# ── Image loader helper ───────────────────────────────────────────────────────
def _load_mascot(key, size):
    """Load a mascot PNG, resize to fit display, return PIL Image or None."""
    path = MASCOT.get(key, "")
    if not os.path.exists(path):
        return None
    try:
        img = Image.open(path).convert("RGBA")
        # Fit inside size keeping aspect ratio
        img.thumbnail(size, Image.LANCZOS)
        # Paste onto black background
        bg = Image.new("RGB", size, (0, 0, 0))
        offset = ((size[0] - img.width) // 2, (size[1] - img.height) // 2)
        bg.paste(img, offset, img)
        return bg
    except Exception as e:
        print(f"[Display] Could not load mascot '{key}': {e}")
        return None


def _retro_font(size=12):
    """Try to load a font, fall back to default."""
    try:
        return ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)
    except Exception:
        return ImageFont.load_default()


# ── Mock loop ─────────────────────────────────────────────────────────────────
def _mock_loop():
    last_printed = None
    while _running:
        if _state != last_printed:
            labels = {
                "idle":     "IDLE — starfield + mascot-idle",
                "studying": "STUDYING — mascot-focused + scanlines",
                "break":    "BREAK — flashing + mascot-dancing",
                "sleeping": "SLEEPING — dark + mascot-sleeping",
                "phone":    "PHONE ALERT — mascot-phone",
            }
            print(f"[Display] {labels.get(_state, _state.upper())}")
            last_printed = _state
        time.sleep(2)


# ── Real loop ─────────────────────────────────────────────────────────────────
def _real_loop():
    disp = st7735.ST7735(
        port=0, cs=8,
        dc=24, rst=25, backlight=None, rotation=270
    )
    disp.begin()
    W, H = disp.width, disp.height

    # Pre-load mascots at display size
    mascots = {k: _load_mascot(k, (W, H)) for k in MASCOT}

    # Starfield
    stars = [(random.randint(0, W), random.randint(0, H),
              random.uniform(0.5, 3.0)) for _ in range(50)]

    # Retro scanline overlay (every other row dimmed)
    def _draw_scanlines(draw, w, h):
        for y in range(0, h, 2):
            draw.line([(0, y), (w, y)], fill=(0, 0, 0, 60))

    frame      = 0
    flash      = False
    last_state = None
    bob_offset = 0

    while _running:

        # ── LED update on state change ─────────────────────────────────────
        if _state != last_state:
            _all_leds_off()
            if _state == "studying":
                _set_leds_studying()
                buzz(1)
            elif _state == "break":
                _set_leds_break()
                buzz(3)
            elif _state == "sleeping":
                _set_leds_sleeping()
            elif _state in ("idle", "phone"):
                _set_leds_away()
            last_state = _state

        # ── Base canvas ───────────────────────────────────────────────────
        img  = Image.new("RGB", (W, H), (0, 0, 0))
        draw = ImageDraw.Draw(img)

        # ════════════════════════════════════════════════════════════════════
        # IDLE — starfield background + idle mascot bobbing
        # ════════════════════════════════════════════════════════════════════
        if _state == "idle":
            # Scrolling starfield
            for i, (sx, sy, speed) in enumerate(stars):
                brightness = int(180 + 75 * math.sin(frame * 0.07 + i))
                r = 1 if speed < 1.5 else 2
                draw.ellipse([sx-r, sy-r, sx+r, sy+r],
                             fill=(brightness, brightness, brightness))
            # Mascot bobbing up/down
            bob = int(4 * math.sin(frame * 0.1))
            m   = mascots.get("idle")
            if m:
                tmp = Image.new("RGB", (W, H), (0, 0, 0))
                tmp.paste(m, (0, bob))
                img = Image.blend(img, tmp, 0.9)
                draw = ImageDraw.Draw(img)
            # Retro label
            font = _retro_font(10)
            draw.text((W//2, H - 10), "ORBIT", font=font,
                      fill=(255, 200, 0), anchor="mm")

        # ════════════════════════════════════════════════════════════════════
        # STUDYING — green tinted bg + focused mascot + scanlines
        # ════════════════════════════════════════════════════════════════════
        elif _state == "studying":
            # Dark green retro bg
            draw.rectangle([0, 0, W, H], fill=(0, 15, 0))
            # Pixel grid effect
            for gx in range(0, W, 8):
                draw.line([(gx, 0), (gx, H)], fill=(0, 30, 0))
            for gy in range(0, H, 8):
                draw.line([(0, gy), (W, gy)], fill=(0, 30, 0))
            # Mascot
            m = mascots.get("focused")
            if m:
                img.paste(m, (0, 0))
                draw = ImageDraw.Draw(img)
            # Scanlines
            for y in range(0, H, 2):
                draw.line([(0, y), (W, y)], fill=(0, 0, 0))
            # Pulsing border
            border_bright = int(100 + 80 * math.sin(frame * 0.1))
            draw.rectangle([0, 0, W-1, H-1],
                           outline=(0, border_bright, 0), width=2)
            # Label
            font = _retro_font(9)
            draw.text((W//2, 6), "STUDYING", font=font,
                      fill=(0, 255, 80), anchor="mm")

        # ════════════════════════════════════════════════════════════════════
        # BREAK — flashing warm bg + dancing mascot
        # ════════════════════════════════════════════════════════════════════
        elif _state == "break":
            flash = not flash
            bg    = (180, 40, 0) if flash else (80, 10, 0)
            draw.rectangle([0, 0, W, H], fill=bg)
            # Dancing mascot alternates every 8 frames
            key = "dancing" if (frame // 8) % 2 == 0 else "happy"
            m   = mascots.get(key) or mascots.get("dancing")
            if m:
                img.paste(m, (0, 0))
                draw = ImageDraw.Draw(img)
            # Scanlines
            for y in range(0, H, 2):
                draw.line([(0, y), (W, y)], fill=(0, 0, 0))
            font = _retro_font(11)
            draw.text((W//2, 6), "BREAK!", font=font,
                      fill=(255, 220, 0), anchor="mm")

        # ════════════════════════════════════════════════════════════════════
        # SLEEPING — deep blue + sleeping mascot + slow stars
        # ════════════════════════════════════════════════════════════════════
        elif _state == "sleeping":
            draw.rectangle([0, 0, W, H], fill=(0, 0, 20))
            # Slow twinkling stars
            for i, (sx, sy, speed) in enumerate(stars[:30]):
                b = int(60 + 40 * math.sin(frame * 0.03 + i))
                draw.point((sx, sy), fill=(b, b, b+40))
            # Sleeping mascot
            m = mascots.get("sleeping")
            if m:
                img.paste(m, (0, 0))
                draw = ImageDraw.Draw(img)
            # Floating Z's
            font = _retro_font(14)
            z_y  = int(20 + 10 * math.sin(frame * 0.05))
            draw.text((W - 15, z_y), "z", font=font, fill=(150, 150, 255))
            font2 = _retro_font(10)
            draw.text((W - 25, z_y + 18), "z", font=font2, fill=(100, 100, 200))

        # ════════════════════════════════════════════════════════════════════
        # PHONE — red alert + phone mascot + warning flash
        # ════════════════════════════════════════════════════════════════════
        elif _state == "phone":
            flash = not flash
            bg    = (60, 0, 0) if flash else (20, 0, 0)
            draw.rectangle([0, 0, W, H], fill=bg)
            m = mascots.get("phone")
            if m:
                img.paste(m, (0, 0))
                draw = ImageDraw.Draw(img)
            for y in range(0, H, 2):
                draw.line([(0, y), (W, y)], fill=(0, 0, 0))
            font = _retro_font(9)
            draw.text((W//2, 6), "PUT IT DOWN", font=font,
                      fill=(255, 80, 80), anchor="mm")

        disp.display(img)
        frame += 1
        time.sleep(0.05)   # ~20 fps


# ── Public API ────────────────────────────────────────────────────────────────
def set_state(new_state: str):
    """States: idle | studying | break | sleeping | phone"""
    global _state
    _state = new_state

def start():
    global _running, _thread
    _running = True
    target   = _mock_loop if _mock_mode else _real_loop
    _thread  = threading.Thread(target=target, daemon=True, name="DisplayThread")
    _thread.start()

def stop():
    global _running
    _running = False
    if not _mock_mode:
        _all_leds_off()
        GPIO.cleanup()
