# display.py — TFT display + LEDs + Buzzer with pixel art tamagotchi character

import threading
import time
import math
import random

_mock_mode = False

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
    from PIL import Image, ImageDraw
    print("[Display] Real GPIO + ST7735 initialized")

except ImportError:
    _mock_mode = True
    print("[Display] Mock mode — display output goes to terminal")

_state   = "idle"
_running = False
_thread  = None

# ── LED helpers ───────────────────────────────────────────────────────────────
def _all_leds_off():
    if _mock_mode: return
    for pin in [LED_GREEN, LED_YELLOW, LED_RED, LED_WHITE]:
        GPIO.output(pin, GPIO.LOW)

def _set_leds_studying():
    if _mock_mode: return
    GPIO.output(LED_GREEN,  GPIO.HIGH)
    GPIO.output(LED_WHITE,  GPIO.HIGH)
    GPIO.output(LED_YELLOW, GPIO.LOW)
    GPIO.output(LED_RED,    GPIO.LOW)

def _set_leds_break():
    if _mock_mode: return
    GPIO.output(LED_RED,    GPIO.HIGH)
    GPIO.output(LED_YELLOW, GPIO.HIGH)
    GPIO.output(LED_GREEN,  GPIO.LOW)
    GPIO.output(LED_WHITE,  GPIO.LOW)

def _set_leds_away():
    if _mock_mode: return
    GPIO.output(LED_YELLOW, GPIO.HIGH)
    GPIO.output(LED_GREEN,  GPIO.LOW)
    GPIO.output(LED_RED,    GPIO.LOW)
    GPIO.output(LED_WHITE,  GPIO.LOW)

def _set_leds_sleeping():
    if _mock_mode: return
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


# ── Pixel art drawing helpers ─────────────────────────────────────────────────
def _px(draw, x, y, s, color):
    """Draw a pixel block of size s at grid position x,y."""
    draw.rectangle([x*s, y*s, x*s+s-1, y*s+s-1], fill=color)

def _draw_char(draw, cx, cy, s, face, color):
    """
    Draw tamagotchi character centered at (cx,cy) on a pixel grid.
    face: 'normal'|'happy'|'sad'|'sleep'|'angry'|'focused'
    s: pixel block size
    cx, cy: center in pixel coords
    """
    W = color
    B = (0, 0, 0)

    # Convert center pixel to grid
    gx = cx // s
    gy = cy // s

    # ── Body (rounded blob) ──────────────────────────────────────
    body = [
        (0,0),(1,0),(2,0),(3,0),(4,0),
        (-1,1),(0,1),(1,1),(2,1),(3,1),(4,1),(5,1),
        (-1,2),(0,2),(1,2),(2,2),(3,2),(4,2),(5,2),
        (-1,3),(0,3),(1,3),(2,3),(3,3),(4,3),(5,3),
        (0,4),(1,4),(2,4),(3,4),(4,4),
    ]
    for bx, by in body:
        _px(draw, gx+bx-2, gy+by-2, s, W)

    # ── Face expressions ──────────────────────────────────────────
    if face == 'normal':
        # Eyes: two dots
        _px(draw, gx,   gy, s, B)
        _px(draw, gx+2, gy, s, B)
        # Mouth: small smile
        _px(draw, gx,   gy+2, s, B)
        _px(draw, gx+1, gy+3, s, B)
        _px(draw, gx+2, gy+2, s, B)

    elif face == 'happy':
        # Eyes: ^ ^
        _px(draw, gx,   gy-1, s, B)
        _px(draw, gx+1, gy,   s, B)
        _px(draw, gx+2, gy-1, s, B)
        _px(draw, gx+4, gy-1, s, B)
        _px(draw, gx+3, gy,   s, B)  # wrong offset fix below
        # Big smile
        _px(draw, gx-1, gy+2, s, B)
        _px(draw, gx,   gy+3, s, B)
        _px(draw, gx+1, gy+3, s, B)
        _px(draw, gx+2, gy+3, s, B)
        _px(draw, gx+3, gy+2, s, B)

    elif face == 'sad':
        # Eyes: droopy
        _px(draw, gx,   gy, s, B)
        _px(draw, gx+2, gy, s, B)
        # Tears
        _px(draw, gx,   gy+1, s, (100,180,255))
        _px(draw, gx+2, gy+1, s, (100,180,255))
        # Frown
        _px(draw, gx,   gy+3, s, B)
        _px(draw, gx+1, gy+2, s, B)
        _px(draw, gx+2, gy+3, s, B)

    elif face == 'sleep':
        # Eyes: closed lines
        _px(draw, gx,   gy, s, B)
        _px(draw, gx+1, gy, s, B)
        _px(draw, gx+2, gy, s, B)
        _px(draw, gx+4, gy, s, B)  # oops, fix
        # Zzz mouth
        _px(draw, gx+1, gy+2, s, B)

    elif face == 'angry':
        # Eyes: angry slant
        _px(draw, gx+1, gy-1, s, B)
        _px(draw, gx,   gy,   s, B)
        _px(draw, gx+3, gy-1, s, B)
        _px(draw, gx+2, gy,   s, B)  # adjusted
        # Frown
        _px(draw, gx,   gy+3, s, B)
        _px(draw, gx+1, gy+2, s, B)
        _px(draw, gx+2, gy+3, s, B)

    elif face == 'focused':
        # Eyes: determined, thick
        _px(draw, gx,   gy, s, B)
        _px(draw, gx+1, gy, s, B)
        _px(draw, gx+3, gy, s, B)
        _px(draw, gx+4, gy, s, B)  # adjusted
        # Straight mouth
        _px(draw, gx,   gy+2, s, B)
        _px(draw, gx+1, gy+2, s, B)
        _px(draw, gx+2, gy+2, s, B)

    # ── Feet ─────────────────────────────────────────────────────
    _px(draw, gx-1, gy+3, s, W)
    _px(draw, gx+3, gy+3, s, W)


# ── Mock loop ─────────────────────────────────────────────────────────────────
def _mock_loop():
    last = None
    while _running:
        if _state != last:
            print(f"[Display] Pixel art state: {_state.upper()}")
            last = _state
        time.sleep(2)


# ── Real loop ─────────────────────────────────────────────────────────────────
def _real_loop():
    disp = st7735.ST7735(
        port=0, cs=0,
        dc=24, rst=25, backlight=None, rotation=270
    )
    disp.begin()
    W, H = disp.width, disp.height

    S = 4  # pixel block size — 4x4 per "pixel"

    # Starfield
    stars = [(random.randint(0, W), random.randint(0, H)) for _ in range(40)]

    frame      = 0
    last_state = None
    blink      = True
    bob        = 0

    while _running:

        # ── LED update on state change ─────────────────────────────
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

        img  = Image.new("RGB", (W, H), (0, 0, 0))
        draw = ImageDraw.Draw(img)

        WHITE  = (255, 255, 255)
        BLACK  = (0, 0, 0)
        DIM    = (80, 80, 80)
        GREEN  = (0, 255, 80)
        RED    = (255, 60, 60)
        BLUE   = (100, 160, 255)
        YELLOW = (255, 220, 0)

        cx = W // 2
        bob_y = int(3 * math.sin(frame * 0.15))

        # ════════════════════════════════════════════════════════════
        # IDLE — starfield + blinking normal face
        # ════════════════════════════════════════════════════════════
        if _state == "idle":
            # Twinkling stars
            for i, (sx, sy) in enumerate(stars):
                b = int(120 + 80 * math.sin(frame * 0.08 + i))
                draw.point((sx, sy), fill=(b, b, b))

            # Blink every 60 frames
            face = 'normal'
            if frame % 60 < 4:
                face = 'sleep'  # eyes closed = blink

            cy = H // 2 + bob_y
            _draw_char(draw, cx, cy, S, face, WHITE)

            # "ORBIT" text in pixels
            _pixel_text(draw, "ORBIT", W//2 - 20, H - 12, DIM, 2)

        # ════════════════════════════════════════════════════════════
        # STUDYING — grid bg + focused face + pulsing border
        # ════════════════════════════════════════════════════════════
        elif _state == "studying":
            # Pixel grid
            for gx in range(0, W, 8):
                draw.line([(gx, 0), (gx, H)], fill=(0, 25, 0))
            for gy in range(0, H, 8):
                draw.line([(0, gy), (W, gy)], fill=(0, 25, 0))

            cy = H // 2
            _draw_char(draw, cx, cy, S, 'focused', GREEN)

            # Pulsing border
            b = int(80 + 60 * math.sin(frame * 0.1))
            draw.rectangle([0, 0, W-1, H-1], outline=(0, b, 0), width=2)
            _pixel_text(draw, "FOCUS", W//2 - 20, 5, GREEN, 2)

        # ════════════════════════════════════════════════════════════
        # BREAK — flashing bg + happy jumping character
        # ════════════════════════════════════════════════════════════
        elif _state == "break":
            flash = (frame // 6) % 2 == 0
            bg = (30, 0, 0) if flash else (15, 0, 0)
            draw.rectangle([0, 0, W, H], fill=bg)

            # Jump animation
            jump = abs(int(6 * math.sin(frame * 0.2)))
            cy = H // 2 - jump
            _draw_char(draw, cx, cy, S, 'happy', YELLOW)

            _pixel_text(draw, "BREAK!", W//2 - 24, 5, YELLOW, 2)

            # Confetti dots
            random.seed(frame // 4)
            for _ in range(8):
                rx = random.randint(0, W)
                ry = random.randint(0, H//3)
                rc = random.choice([YELLOW, WHITE, RED])
                draw.rectangle([rx, ry, rx+2, ry+2], fill=rc)

        # ════════════════════════════════════════════════════════════
        # SLEEPING — dark blue + sleeping face + floating Z's
        # ════════════════════════════════════════════════════════════
        elif _state == "sleeping":
            draw.rectangle([0, 0, W, H], fill=(0, 0, 15))

            # Slow stars
            for i, (sx, sy) in enumerate(stars[:20]):
                b = int(40 + 20 * math.sin(frame * 0.03 + i))
                draw.point((sx, sy), fill=(b, b, b+30))

            cy = H // 2 + 5
            _draw_char(draw, cx, cy, S, 'sleep', BLUE)

            # Floating Z's
            z1y = int(H//3 + 8 * math.sin(frame * 0.05))
            z2y = int(H//4 + 6 * math.sin(frame * 0.05 + 1))
            z3y = int(H//5 + 4 * math.sin(frame * 0.05 + 2))
            _pixel_text(draw, "z", cx + 20, z1y,     BLUE, 3)
            _pixel_text(draw, "z", cx + 28, z2y - 8, DIM,  2)
            _pixel_text(draw, "z", cx + 34, z3y - 16,(40,40,80), 2)

        # ════════════════════════════════════════════════════════════
        # PHONE — red flash + angry face
        # ════════════════════════════════════════════════════════════
        elif _state == "phone":
            flash = (frame // 4) % 2 == 0
            bg = (25, 0, 0) if flash else (10, 0, 0)
            draw.rectangle([0, 0, W, H], fill=bg)

            cy = H // 2
            _draw_char(draw, cx, cy, S, 'angry', RED)

            _pixel_text(draw, "PUT IT", W//2 - 24, 5,  RED, 2)
            _pixel_text(draw, " DOWN!", W//2 - 24, 16, RED, 2)

            # Warning border flash
            if flash:
                draw.rectangle([0, 0, W-1, H-1], outline=RED, width=2)

        disp.display(img)
        frame += 1
        time.sleep(0.05)


def _pixel_text(draw, text, x, y, color, size=2):
    """Tiny 3x5 pixel font renderer."""
    FONT = {
        'A': ["010","101","111","101","101"],
        'B': ["110","101","110","101","110"],
        'C': ["011","100","100","100","011"],
        'D': ["110","101","101","101","110"],
        'E': ["111","100","110","100","111"],
        'F': ["111","100","110","100","100"],
        'G': ["011","100","101","101","011"],
        'H': ["101","101","111","101","101"],
        'I': ["111","010","010","010","111"],
        'K': ["101","110","100","110","101"],
        'L': ["100","100","100","100","111"],
        'M': ["101","111","101","101","101"],
        'N': ["101","111","111","101","101"],
        'O': ["010","101","101","101","010"],
        'P': ["110","101","110","100","100"],
        'R': ["110","101","110","101","101"],
        'S': ["011","100","010","001","110"],
        'T': ["111","010","010","010","010"],
        'U': ["101","101","101","101","011"],
        'W': ["101","101","111","111","101"],
        'X': ["101","101","010","101","101"],
        'Y': ["101","101","010","010","010"],
        'Z': ["111","001","010","100","111"],
        '!': ["010","010","010","000","010"],
        ' ': ["000","000","000","000","000"],
        '.': ["000","000","000","000","010"],
        ':': ["000","010","000","010","000"],
    }
    ox = x
    for ch in text.upper():
        if ch not in FONT:
            ox += (3 + 1) * size
            continue
        rows = FONT[ch]
        for row_i, row in enumerate(rows):
            for col_i, pixel in enumerate(row):
                if pixel == '1':
                    px = ox + col_i * size
                    py = y + row_i * size
                    draw.rectangle([px, py, px+size-1, py+size-1], fill=color)
        ox += (3 + 1) * size


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
