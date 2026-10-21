"""Golden Jubilee banner: HTML + SVG rendered by headless Edge at 2x (correct Bangla shaping)."""
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

GOLD = "#c9a24e"
GOLD_LIGHT = "#ecd391"
CREAM = "#f4eddb"
MINT = "#a9d8c2"

CX, CY = 1010, 384  # the emblem (moved to the centre for the text-free version)
DISC = 118          # the heartwood disc behind "50"
BARK = 232          # the newest ring


def rings_svg() -> str:
    parts = []
    # Wide, faint growth rings spreading across the whole banner from the emblem.
    for k in range(1, 30):
        r = BARK + 22 + k * 26 + 5 * math.sin(k * 1.3)
        op = 0.10 * (1 - k / 32) + 0.015
        parts.append(f'<circle cx="{CX}" cy="{CY}" r="{r:.2f}" fill="none" stroke="{GOLD}" stroke-opacity="{op:.3f}" stroke-width="0.8"/>')
    # Fifty rings between the heartwood and the bark: one per batch, 1977 to 2026.
    widths = [1 + 0.25 * math.sin(i * 0.37 + 0.6) + 0.12 * math.sin(i * 1.9) for i in range(50)]
    scale = (BARK - DISC - 8) / sum(widths)
    r = DISC + 8
    for i, w in enumerate(widths):
        r += w * scale
        year = 1977 + i
        if year == 2026:
            parts.append(f'<circle cx="{CX}" cy="{CY}" r="{r:.2f}" fill="none" stroke="url(#gold)" stroke-width="3"/>')
        elif (year - 1976) % 10 == 0:
            parts.append(f'<circle cx="{CX}" cy="{CY}" r="{r:.2f}" fill="none" stroke="{GOLD}" stroke-opacity="0.85" stroke-width="1.3"/>')
        else:
            parts.append(f'<circle cx="{CX}" cy="{CY}" r="{r:.2f}" fill="none" stroke="{GOLD}" stroke-opacity="0.42" stroke-width="0.55"/>')
    # Fifty ticks outside the bark; every tenth year longer.
    for i in range(50):
        year = 1977 + i
        t = -math.pi / 2 + 2 * math.pi * (i + 1) / 50
        long = (year - 1976) % 10 == 0
        r1, r2 = BARK + 12, BARK + (30 if long else 20)
        col = GOLD_LIGHT if year == 2026 else GOLD
        op = 1 if year == 2026 else (0.85 if long else 0.5)
        parts.append(
            f'<line x1="{CX + r1 * math.cos(t):.2f}" y1="{CY + r1 * math.sin(t):.2f}" x2="{CX + r2 * math.cos(t):.2f}" y2="{CY + r2 * math.sin(t):.2f}" '
            f'stroke="{col}" stroke-opacity="{op}" stroke-width="{1.6 if long else 1}" stroke-linecap="round"/>'
        )
    # The heartwood.
    parts.append(f'<circle cx="{CX}" cy="{CY}" r="{DISC}" fill="url(#heart)"/>')
    parts.append(f'<circle cx="{CX}" cy="{CY}" r="{DISC}" fill="none" stroke="url(#gold)" stroke-width="1.6"/>')
    parts.append(f'<circle cx="{CX}" cy="{CY}" r="{DISC - 10}" fill="none" stroke="{GOLD}" stroke-opacity="0.35" stroke-width="0.8"/>')
    return "\n".join(parts)


def page(with_text: bool) -> str:
    global CX
    CX = 1010 if with_text else W // 2
    text = f"""
  <div class="block">
    <div class="assoc"><img src="file:///{(PUBLIC / 'logo.png').as_posix()}" alt=""><span>SSGHS ALUMNI ASSOCIATION</span></div>
    <div class="school-bn">সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়</div>
    <div class="title-bn">সুবর্ণ জয়ন্তী</div>
    <div class="title-en">Golden Jubilee</div>
    <div class="rule"></div>
    <div class="years">1976 <span>—</span> 2026</div>
    <div class="when">Around 26 December 2026 · date to be confirmed</div>
    <div class="where">School campus · Sitakunda, Chattogram</div>
  </div>""" if with_text else ""
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face {{ font-family: Gloock; src: url('{FONTS}Gloock-Regular.ttf'); }}
@font-face {{ font-family: InstrumentSerif; font-style: italic; src: url('{FONTS}InstrumentSerif-Italic.ttf'); }}
@font-face {{ font-family: Jura; src: url('{FONTS}Jura-Light.ttf'); }}
@font-face {{ font-family: DMMono; src: url('{FONTS}DMMono-Regular.ttf'); }}
@font-face {{ font-family: WorkSans; src: url('{FONTS}WorkSans-Regular.ttf'); }}
html, body {{ margin: 0; width: {W}px; height: {H}px; overflow: hidden; }}
body {{
  position: relative;
  background:
    radial-gradient(ellipse 760px 620px at {CX}px {CY}px, #11523d 0%, #0b4031 38%, #072d22 72%, #04201a 100%);
}}
body::after {{ /* soft vignette */
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.28) 100%);
}}
svg {{ position: absolute; inset: 0; }}
.num {{
  position: absolute; left: {CX - 120}px; top: {CY - 72}px; width: 240px; text-align: center;
  font-family: Gloock; font-size: 118px; line-height: 1; letter-spacing: -2px;
  background: linear-gradient(180deg, {GOLD_LIGHT} 0%, {GOLD} 62%, #a7832f 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent; z-index: 2;
}}
.num-sub {{
  position: absolute; left: {CX - 120}px; top: {CY + 52}px; width: 240px; text-align: center; z-index: 2;
  font-family: Jura; font-size: 12px; letter-spacing: 6px; color: {MINT}; padding-left: 6px;
}}
.block {{ position: absolute; left: 112px; top: 0; height: {H}px; width: 640px; z-index: 2;
  display: flex; flex-direction: column; justify-content: center; }}
.assoc {{ display: flex; align-items: center; gap: 14px; margin-bottom: 34px; }}
.assoc img {{ width: 46px; height: 46px; border-radius: 50%; background: #fff; padding: 2px; box-shadow: 0 0 0 1px rgba(201,162,78,.6); }}
.assoc span {{ font-family: Jura; font-size: 14px; letter-spacing: 5px; color: {MINT}; }}
.school-bn {{ font-family: 'Shonar Bangla', 'Nirmala UI', sans-serif; font-size: 24px; color: #d7ebe1; margin-bottom: 6px; }}
.title-bn {{ font-family: 'Shonar Bangla', 'Nirmala UI', sans-serif; font-weight: 700; font-size: 84px; line-height: 1.12;
  background: linear-gradient(180deg, {GOLD_LIGHT} 10%, {GOLD} 70%, #a7832f 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent; }}
.title-en {{ font-family: InstrumentSerif; font-style: italic; font-size: 64px; line-height: 1; color: {CREAM}; margin-top: 2px; }}
.rule {{ width: 92px; height: 2px; margin: 30px 0 22px; background: linear-gradient(90deg, {GOLD_LIGHT}, {GOLD}); }}
.years {{ font-family: DMMono; font-size: 22px; letter-spacing: 6px; color: {GOLD_LIGHT}; margin-bottom: 16px; }}
.years span {{ color: {GOLD}; letter-spacing: 0; padding: 0 6px; }}
.when, .where {{ font-family: WorkSans; font-size: 18px; line-height: 1.55; color: rgba(244,237,219,.88); letter-spacing: .3px; }}
</style></head>
<body>
<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{GOLD_LIGHT}"/><stop offset="1" stop-color="#a7832f"/></linearGradient>
    <radialGradient id="heart" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stop-color="#0f4a38"/><stop offset="1" stop-color="#062b20"/></radialGradient>
  </defs>
  {rings_svg()}
</svg>
<div class="num">50</div>
<div class="num-sub">YEARS</div>
{text}
</body></html>"""


def render(name: str, with_text: bool) -> None:
    html = HERE / f"{name}.html"
    png = HERE / f"{name}.png"
    html.write_text(page(with_text), encoding="utf-8")
    subprocess.run(
        [EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
         f"--window-size={W},{H}", f"--screenshot={png}", html.as_uri()],
        check=True, capture_output=True, timeout=120,
    )
    im = Image.open(png).convert("RGB")
    assert im.size == (W * 2, H * 2), im.size
    out = (PUBLIC if "--publish" in sys.argv else HERE) / f"{name}.jpg"
    im.save(out, quality=90, optimize=True, progressive=True)
    print(name, im.size, out, out.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    render("golden-jubilee-banner", True)
    render("golden-jubilee-art", False)
