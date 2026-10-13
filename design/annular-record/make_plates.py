"""Annular Record: three plates. Drawn at 2x, downsampled with Lanczos."""
import math
import random
from PIL import Image, ImageDraw, ImageFont

FONTS = "C:/Users/jashe/AppData/Roaming/Claude/local-agent-mode-sessions/skills-plugin/fd07ac21-6927-4e3b-8f8f-12c0d642b22b/b2063275-7648-4cf3-b2b4-922aeb95eb28/skills/canvas-design/canvas-fonts/"
OUT = "D:/SaaS Project/sshs-alumni/design/annular-record/"

W, H, S = 2400, 3000, 2
PAPER = (242, 238, 228)
INK = (11, 59, 44)
GOLD = (176, 138, 58)
RULE = (214, 207, 192)
MARGIN = 170

YEARS = list(range(1977, 2027))  # fifty batches; 1976 is the pith


def mix(c, t):
    """Ink diluted toward the paper: t=1 full ink, t=0 paper."""
    return tuple(round(p + (x - p) * t) for x, p in zip(c, PAPER))


def font(name, size):
    return ImageFont.truetype(FONTS + name, int(size * S))


class Plate:
    def __init__(self):
        self.im = Image.new("RGB", (W * S, H * S), PAPER)
        self.d = ImageDraw.Draw(self.im)

    def P(self, x, y):
        return (x * S, y * S)

    def line(self, pts, color, width):
        self.d.line([self.P(*p) for p in pts], fill=color, width=max(1, round(width * S)), joint="curve")

    def circle(self, cx, cy, r, fill=None, outline=None, width=1.0):
        self.d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill=fill, outline=outline, width=max(1, round(width * S)))

    def text(self, x, y, s, f, color, tracking=0.0, anchor="la"):
        """Text with letter-spacing (tracking in px at 1x). Anchors: la, ra, ma (top), ls (baseline)."""
        widths = [f.getlength(ch) for ch in s]
        total = sum(widths) + tracking * S * (len(s) - 1)
        if anchor[0] == "r":
            x0 = x * S - total
        elif anchor[0] == "m":
            x0 = x * S - total / 2
        else:
            x0 = x * S
        va = "ls" if anchor[1] == "s" else "la"
        cx = x0
        for ch, w in zip(s, widths):
            self.d.text((cx, y * S), ch, font=f, fill=color, anchor=va)
            cx += w + tracking * S
        return total / S

    def knockout(self, x, y, w, h):
        self.d.rectangle([x * S, y * S, (x + w) * S, (y + h) * S], fill=PAPER)

    def frame(self, plate_no, title, caption, phrase):
        head = font("Jura-Light.ttf", 27)
        mono = font("DMMono-Regular.ttf", 19)
        ital = font("InstrumentSerif-Italic.ttf", 58)
        top = MARGIN - 40
        self.text(MARGIN, top, "ANNULAR RECORD", head, INK, tracking=9)
        self.text(W - MARGIN, top, f"PL. {plate_no}", head, INK, tracking=9, anchor="ra")
        self.line([(MARGIN, top + 58), (W - MARGIN, top + 58)], mix(INK, 0.35), 1.2)
        self.text(MARGIN, top + 82, title, mono, mix(INK, 0.6), tracking=2.5)
        self.text(W - MARGIN, top + 82, "1976 — 2026", mono, mix(INK, 0.6), tracking=2.5, anchor="ra")
        base = H - MARGIN + 10
        self.line([(MARGIN, base - 128), (W - MARGIN, base - 128)], mix(INK, 0.35), 1.2)
        self.text(MARGIN, base - 40, phrase, ital, INK, anchor="ls")
        self.text(W - MARGIN, base - 50, caption, mono, mix(INK, 0.6), tracking=2.5, anchor="rs")

    def save(self, name):
        self.im.resize((W, H), Image.LANCZOS).save(OUT + name, optimize=True)


def growth_widths(seed, n=50):
    """Ring widths with the slow swing and small noise of real growth."""
    rnd = random.Random(seed)
    ws = []
    for i in range(n):
        slow = 1 + 0.22 * math.sin(i / 50 * math.pi * 3.1 + 0.6) + 0.12 * math.sin(i / 50 * math.pi * 7.3)
        ws.append(max(0.45, slow * (1 + rnd.uniform(-0.18, 0.18))))
    return ws


# ── Plate I: fifty rings around one heartwood ─────────────────────────
def plate_one():
    p = Plate()
    cx, cy = W / 2, 1450
    pith, outer = 34, 860
    ws = growth_widths(1976)
    scale = (outer - pith) / sum(ws)
    radii, r = [], pith
    for w in ws:
        r += w * scale
        radii.append(r)

    # One shared wobble for the whole trunk, growing smoothly outward: nested
    # like real growth, never crossing. A whisper of per-ring grain on top.
    rnd = random.Random(50)
    grain = [rnd.uniform(0, 6.28) for _ in radii]
    def ring(i, rr, steps=1080):
        amp = 0.010 * (rr / outer) ** 1.4
        pts = []
        for k in range(steps + 1):
            t = 2 * math.pi * k / steps
            m = 1 + amp * (math.sin(3 * t + 0.9) + 0.55 * math.sin(5 * t + 2.1) + 0.25 * math.sin(2 * t + 0.3))
            m += 0.0009 * math.sin(13 * t + grain[i])
            pts.append((cx + rr * m * math.cos(t), cy + rr * m * math.sin(t)))
        return pts

    # Faint latewood bands between rings: a darker tint hugging each ring's outside.
    for i, rr in enumerate(radii[:-1]):
        decade = (YEARS[i] - 1976) % 10 == 0
        p.line(ring(i, rr), mix(INK, 0.78 if decade else 0.5), 2.2 if decade else 1.25)
    p.line(ring(49, radii[-1]), GOLD, 3.4)
    # Heartwood: the founding year.
    p.circle(cx, cy, 9, fill=INK)
    p.circle(cx, cy, 20, outline=mix(INK, 0.5), width=1.1)

    # Fifty ticks outside the bark, one per batch; every tenth is longer.
    tick_r = outer + 46
    for i, year in enumerate(YEARS):
        t = -math.pi / 2 + 2 * math.pi * (i + 1) / 50
        long = (year - 1976) % 10 == 0
        l = 26 if long else 12
        col = GOLD if year == 2026 else mix(INK, 0.75 if long else 0.45)
        p.line([(cx + tick_r * math.cos(t), cy + tick_r * math.sin(t)), (cx + (tick_r + l) * math.cos(t), cy + (tick_r + l) * math.sin(t))], col, 1.6 if long else 1.1)

    # The surveyor's radius: decade rings read off along one line.
    mono = font("DMMono-Regular.ttf", 17)
    ang = math.radians(-38)
    ux, uy = math.cos(ang), math.sin(ang)
    p.line([(cx + 24 * ux, cy + 24 * uy), (cx + (tick_r + 78) * ux, cy + (tick_r + 78) * uy)], mix(INK, 0.55), 1.0)
    for i, year in enumerate(YEARS):
        if (year - 1976) % 10 and year != 2026:
            continue
        rr = radii[i]
        amp = 0.010 * (rr / outer) ** 1.4
        m = 1 + amp * (math.sin(3 * ang + 0.9) + 0.55 * math.sin(5 * ang + 2.1) + 0.25 * math.sin(2 * ang + 0.3)) + 0.0009 * math.sin(13 * ang + grain[i])
        x, y = cx + rr * m * ux, cy + rr * m * uy
        p.circle(x, y, 4.2, fill=GOLD if year == 2026 else INK)
    # Labels clear of the rings: outside the bark, in a quiet column.
    lx, ly = cx + (tick_r + 96) * ux, cy + (tick_r + 96) * uy
    p.text(lx, ly - 14, "1976 · pith", mono, mix(INK, 0.65), tracking=1.5)
    p.text(lx, ly + 16, "2026 · bark", mono, GOLD, tracking=1.5)

    p.frame("I", "FIG. 1   CROSS-SECTION, FIFTY INCREMENTS", "growth read outward from the founding year", "fifty rings, one heartwood")
    p.save("annular-record-plate-1.png")


# ── Plate II: the roll, fifty columns of returning marks ─────────────
def plate_two():
    p = Plate()
    left, right = MARGIN + 60, W - MARGIN - 60
    base = 2420
    step = (right - left) / 49
    rnd = random.Random(1977)
    pitch, r = 19.5, 5.6
    mono = font("DMMono-Regular.ttf", 17)

    # Quiet horizontal guides.
    for k in range(1, 5):
        y = base - 26 - k * 24 * pitch
        p.line([(left - 30, y), (right + 30, y)], RULE, 1.0)
    for i, year in enumerate(YEARS):
        x = left + i * step
        trend = 0.35 + 0.65 * (i / 49) ** 0.8
        n = max(6, round(98 * trend * (0.78 + 0.32 * rnd.random()) * (0.92 + 0.08 * math.sin(i * 0.9))))
        n = min(n, 96)
        newest = year == 2026
        for k in range(n):
            y = base - 26 - k * pitch
            fade = 0.55 + 0.45 * (1 - k / 110)
            if newest:
                p.circle(x, y, r, fill=GOLD)
            elif (year - 1976) % 10 == 0:
                p.circle(x, y, r, fill=mix(INK, fade))
            else:
                p.circle(x, y, r * 0.86, fill=mix(INK, fade * 0.82))
        long = (year - 1976) % 10 == 0 or year == 1977
        p.line([(x, base), (x, base + (30 if long else 14))], GOLD if newest else mix(INK, 0.7 if long else 0.4), 1.4 if long else 1.0)
        if long or newest:
            p.text(x, base + 44, str(year), mono, GOLD if newest else mix(INK, 0.7), tracking=1.5, anchor="ma")
    p.line([(left - 30, base), (right + 30, base)], mix(INK, 0.8), 1.6)

    p.frame("II", "FIG. 2   THE ROLL, ONE COLUMN PER BATCH", "each column a class; each mark a name", "each mark, a name returning")
    p.save("annular-record-plate-2.png")


# ── Plate III: convergence, fifty paths to the courtyard ─────────────
def plate_three():
    p = Plate()
    cx, cy = W / 2, 1520
    rnd = random.Random(2026)
    rx, ry = 930, 1060
    mono = font("DMMono-Regular.ttf", 17)

    def bez(a, c, b, steps=240):
        return [((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]) for t in (k / steps for k in range(steps + 1))]

    # A faint orbit marks where the fifty began.
    orbit = [(cx + rx * math.cos(2 * math.pi * k / 900), cy + ry * math.sin(2 * math.pi * k / 900)) for k in range(901)]
    p.line(orbit, RULE, 1.0)
    for i, year in enumerate(YEARS):
        t = -math.pi / 2 + 2 * math.pi * i / 50 + rnd.uniform(-0.03, 0.03)
        a = (cx + rx * math.cos(t), cy + ry * math.sin(t))
        # Control point turned off the straight line: the long way home.
        mid = ((a[0] + cx) / 2, (a[1] + cy) / 2)
        dx, dy = cx - a[0], cy - a[1]
        bend = 0.32 + 0.1 * math.sin(i * 1.7)
        c = (mid[0] - dy * bend, mid[1] + dx * bend)
        end_r = 74
        ex, ey = cx - dx / math.hypot(dx, dy) * end_r, cy - dy / math.hypot(dx, dy) * end_r
        newest = year == 2026
        decade = (year - 1976) % 10 == 0
        col = GOLD if newest else mix(INK, 0.8 if decade else 0.42)
        p.line(bez(a, c, (ex, ey)), col, 2.0 if newest else (1.5 if decade else 1.05))
        p.circle(a[0], a[1], 6.5 if decade or newest else 4.2, fill=col)
        if decade or newest or year == 1977:
            ox, oy = a[0] - cx, a[1] - cy
            n = math.hypot(ox, oy)
            lx, ly = a[0] + ox / n * 34, a[1] + oy / n * 34
            anchor = "la" if ox > 40 else ("ra" if ox < -40 else "ma")
            p.text(lx, ly - 10, str(year), mono, GOLD if newest else mix(INK, 0.7), tracking=1.5, anchor=anchor)
    # The courtyard.
    p.circle(cx, cy, 58, outline=GOLD, width=2.2)
    p.circle(cx, cy, 30, outline=mix(INK, 0.5), width=1.1)
    p.circle(cx, cy, 9, fill=INK)

    p.frame("III", "FIG. 3   CONVERGENCE, FIFTY PATHS INWARD", "every batch, the long way home", "all roads lead to the courtyard")
    p.save("annular-record-plate-3.png")


plate_one()
plate_two()
plate_three()
print("done")
