"""Home "One school, generations of friends" image: fifty batches fanning out from the school.

Rendered by headless Edge at 2x (correct Bangla shaping). Run: python make_about.py [--publish]
"""
import math
import subprocess
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
FONTS = "file:///C:/Users/jashe/AppData/Roaming/Claude/local-agent-mode-sessions/skills-plugin/fd07ac21-6927-4e3b-8f8f-12c0d642b22b/b2063275-7648-4cf3-b2b4-922aeb95eb28/skills/canvas-design/canvas-fonts/"
PUBLIC = Path("D:/SaaS Project/sshs-alumni/public")
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
W, H = 1376, 768

INK = "#0b3b2c"
GOLD = "#b8913a"
GOLD_LIGHT = "#e2c27a"
OX, OY = W / 2, 672   # the school: where every ray starts
SEAT = 112            # the school's half-disc
YEARS = list(range(1977, 2027))


def svg() -> str:
    p = []
    # Faint growth arcs behind everything: the years as a horizon.
    for k in range(1, 23):
        r = SEAT + 10 + k * 25
        op = 0.13 * (1 - k / 26) + 0.03
        p.append(f'<path d="M {OX - r:.1f} {OY} A {r:.1f} {r:.1f} 0 0 1 {OX + r:.1f} {OY}" fill="none" stroke="{INK}" stroke-opacity="{op:.3f}" stroke-width="0.8"/>')
    # Fifty rays, one per batch, left (1977) to right (2026).
    a0, a1 = math.radians(196), math.radians(344)
    # One slow wave: the tips trace a single calm contour.
    lengths = [448 + 34 * math.sin(i * 0.26 - 0.9) for i in range(50)]
    for i, year in enumerate(YEARS):
        a = a0 + (a1 - a0) * i / 49
        length = lengths[i]
        x1, y1 = OX + (SEAT + 14) * math.cos(a), OY + (SEAT + 14) * math.sin(a)
        x2, y2 = OX + length * math.cos(a), OY + length * math.sin(a)
        newest = year == 2026
        decade = (year - 1976) % 10 == 0 or year == 1977
        col = GOLD if newest else INK
        op = 1 if newest else (0.85 if decade else 0.38)
        sw = 2.2 if newest else (1.4 if decade else 0.9)
        p.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{col}" stroke-opacity="{op}" stroke-width="{sw}" stroke-linecap="round"/>')
        rr = 6.5 if newest else (5 if decade else 3.4)
        p.append(f'<circle cx="{x2:.2f}" cy="{y2:.2f}" r="{rr}" fill="{col}" fill-opacity="{1 if newest or decade else 0.55}"/>')
        if decade or newest:
            # Beyond the longest nearby tip, so a label never touches a neighbour.
            reach = max(lengths[max(0, i - 3):i + 4]) + 30
            lx, ly = OX + reach * math.cos(a), OY + reach * math.sin(a)
            anchor = "end" if math.cos(a) < -0.25 else ("start" if math.cos(a) > 0.25 else "middle")
            p.append(f'<text x="{lx:.1f}" y="{ly + 5:.1f}" text-anchor="{anchor}" class="yr{" new" if newest else ""}">{year}</text>')
    # The school's seat.
    p.append(f'<path d="M {OX - SEAT} {OY} A {SEAT} {SEAT} 0 0 1 {OX + SEAT} {OY} Z" fill="url(#seat)"/>')
    p.append(f'<path d="M {OX - SEAT} {OY} A {SEAT} {SEAT} 0 0 1 {OX + SEAT} {OY}" fill="none" stroke="url(#gold)" stroke-width="1.8"/>')
    p.append(f'<line x1="0" y1="{OY}" x2="{W}" y2="{OY}" stroke="{INK}" stroke-opacity="0.14" stroke-width="1"/>')
    p.append(f'<line x1="{OX - SEAT - 70}" y1="{OY}" x2="{OX + SEAT + 70}" y2="{OY}" stroke="{INK}" stroke-opacity="0.55" stroke-width="1"/>')
    return "\n".join(p)


def page() -> str:
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face {{ font-family: Jura; src: url('{FONTS}Jura-Light.ttf'); }}
@font-face {{ font-family: DMMono; src: url('{FONTS}DMMono-Regular.ttf'); }}
html, body {{ margin: 0; width: {W}px; height: {H}px; overflow: hidden; }}
body {{ position: relative;
  background: radial-gradient(ellipse 900px 640px at {OX}px {OY}px, #fbf8f0 0%, #f4efe2 55%, #ebe4d2 100%); }}
svg {{ position: absolute; inset: 0; }}
.yr {{ font-family: DMMono; font-size: 13px; letter-spacing: 1.5px; fill: {INK}; fill-opacity: .72; }}
.yr.new {{ fill: {GOLD}; fill-opacity: 1; }}
.seat {{ position: absolute; left: {OX - SEAT}px; width: {SEAT * 2}px; top: {OY - 84}px; text-align: center; }}
.bn {{ font-family: 'Shonar Bangla', 'Nirmala UI', sans-serif; font-weight: 700; font-size: 25px; line-height: 1.15;
  background: linear-gradient(180deg, #f3dc9c, {GOLD_LIGHT} 55%, #c9a24e); -webkit-background-clip: text; background-clip: text; color: transparent; }}
.since {{ font-family: Jura; font-size: 11px; letter-spacing: 4px; color: #b8dccb; margin-top: 8px; padding-left: 4px; }}
</style></head><body>
<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{GOLD_LIGHT}"/><stop offset="1" stop-color="{GOLD}"/></linearGradient>
    <radialGradient id="seat" cx="0.5" cy="1" r="1"><stop offset="0" stop-color="#0f4a38"/><stop offset="1" stop-color="#072d22"/></radialGradient>
  </defs>
  {svg()}
</svg>
<div class="seat"><div class="bn">সবুজ শিক্ষায়তন</div><div class="since">SINCE 1976</div></div>
</body></html>"""


if __name__ == "__main__":
    html = HERE / "about-school.html"
    png = HERE / "about-school.png"
    html.write_text(page(), encoding="utf-8")
    subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
                    f"--window-size={W},{H}", f"--screenshot={png}", html.as_uri()], check=True, capture_output=True, timeout=120)
    im = Image.open(png).convert("RGB")
    assert im.size == (W * 2, H * 2), im.size
    out = (PUBLIC if "--publish" in sys.argv else HERE) / "about-school.jpg"
    im.save(out, quality=90, optimize=True, progressive=True)
    print(out, out.stat().st_size // 1024, "KB")
