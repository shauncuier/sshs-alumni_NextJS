"""Social share cards (1200x630) for every section of the site, plus the background for
the per-batch cards (app/batches/[year]/opengraph-image.tsx).

Rendered by headless Edge at 2x for correct Bangla shaping, then downsampled.
Run: python design/share-cards/make_cards.py   (writes public/og/*.jpg and public/og/batch-bg.png)
"""
import math
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
OUT = ROOT / "public" / "og"
ICONS = ROOT / "node_modules" / "lucide-react" / "dist" / "esm" / "icons"
FONTS = "file:///C:/Users/jashe/.claude/skills/synced/fd07ac21-6927-4e3b-8f8f-12c0d642b22b_b2063275-7648-4cf3-b2b4-922aeb95eb28/canvas-design/canvas-fonts/"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
W, H = 1200, 630
CX, CY = 945, 315        # the emblem (its ticks end 15 px inside the right edge)
DISC, BARK = 104, 214
GOLD, GOLD_LIGHT, CREAM, MINT = "#c9a24e", "#ecd391", "#f4eddb", "#a9d8c2"

CARDS = [
    # key, English title, Bangla title, one line, icon
    ("home", "Praktan Sabujian Parishad", "প্রাক্তন সবুজিয়ান পরিষদ", "Find your batchmates, join our events and give back to the school that taught us.", "users"),
    ("events", "Events & reunions", "অনুষ্ঠান ও পুনর্মিলনী", "Register online, pay by bKash or Nagad and get your ticket.", "calendar-days"),
    ("alumni", "Alumni directory", "প্রাক্তন শিক্ষার্থীদের তালিকা", "Find verified former students by name, SSC batch, profession or city.", "search"),
    ("batches", "SSC batches", "ব্যাচসমূহ", "Every batch since 1977: classmates, representatives and reunions.", "layers"),
    ("school", "Our school since 1976", "আমাদের বিদ্যালয়", "Hafiz Jute Mills, South Sonaichhari, Sitakunda, Chattogram. EIIN 105070.", "school"),
    ("about", "About the association", "পরিষদ পরিচিতি", "Who we are, and what we do for our members and our school.", "info"),
    ("news", "News & notices", "খবর ও নোটিশ", "Updates from the alumni association and the school.", "newspaper"),
    ("stories", "Alumni stories", "স্মৃতিকথা", "Memories and life stories from former students, in their own words.", "book-open"),
    ("achievements", "Alumni achievements", "আমাদের অর্জন", "Honours and achievements of our former students.", "award"),
    ("gallery", "Photo gallery", "ছবির গ্যালারি", "School days, reunions and alumni events.", "images"),
    ("donate", "Give back", "অনুদান", "Support scholarships and school projects. The committee checks every donation.", "heart"),
    ("careers", "Jobs from alumni", "চাকরির খবর", "Job openings shared by fellow alumni and checked by the committee.", "briefcase"),
    ("mentorship", "Mentorship", "পরামর্শ ও দিকনির্দেশনা", "Ask a senior alumnus about studies, admission tests and careers.", "graduation-cap"),
    ("register", "Join the association", "সদস্য হোন", "Register, pay by bKash or Nagad, and get your digital member card.", "user-plus"),
    ("contact", "Contact the committee", "যোগাযোগ", "Questions about membership, events or donations? Write to us.", "mail"),
    ("volunteer", "Volunteer", "স্বেচ্ছাসেবক হোন", "Join a volunteer team for the Golden Jubilee and other events.", "hand-heart"),
]


def icon_svg(name: str, size: int) -> str:
    """A Lucide icon as SVG markup (from the package's icon data)."""
    src = (ICONS / f"{name}.mjs").read_text(encoding="utf-8")
    nodes = re.findall(r'\["(\w+)",\s*\{([^}]*)\}\]', src)
    parts = []
    for tag, attrs in nodes:
        pairs = re.findall(r'(\w+):\s*"([^"]*)"', attrs)
        parts.append(f"<{tag} " + " ".join(f'{k}="{v}"' for k, v in pairs if k != "key") + "/>")
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="url(#ig)" stroke-width="1.6" '
            f'stroke-linecap="round" stroke-linejoin="round"><defs><linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="{GOLD_LIGHT}"/><stop offset="1" stop-color="{GOLD}"/></linearGradient></defs>{"".join(parts)}</svg>')


def rings() -> str:
    p = []
    for k in range(1, 24):
        r = BARK + 18 + k * 24 + 4 * math.sin(k * 1.3)
        p.append(f'<circle cx="{CX}" cy="{CY}" r="{r:.1f}" fill="none" stroke="{GOLD}" stroke-opacity="{0.09 * (1 - k / 26) + 0.015:.3f}" stroke-width="0.8"/>')
    widths = [1 + 0.25 * math.sin(i * 0.37 + 0.6) + 0.12 * math.sin(i * 1.9) for i in range(50)]
    scale = (BARK - DISC - 8) / sum(widths)
    r = DISC + 8
    for i, w in enumerate(widths):
        r += w * scale
        year = 1977 + i
        if year == 2026:
            p.append(f'<circle cx="{CX}" cy="{CY}" r="{r:.2f}" fill="none" stroke="url(#gold)" stroke-width="2.6"/>')
        elif (year - 1976) % 10 == 0:
            p.append(f'<circle cx="{CX}" cy="{CY}" r="{r:.2f}" fill="none" stroke="{GOLD}" stroke-opacity="0.85" stroke-width="1.1"/>')
        else:
            p.append(f'<circle cx="{CX}" cy="{CY}" r="{r:.2f}" fill="none" stroke="{GOLD}" stroke-opacity="0.4" stroke-width="0.5"/>')
    for i in range(50):
        year = 1977 + i
        t = -math.pi / 2 + 2 * math.pi * (i + 1) / 50
        long = (year - 1976) % 10 == 0
        r1, r2 = BARK + 10, BARK + (26 if long else 17)
        op = 1 if year == 2026 else (0.85 if long else 0.5)
        p.append(f'<line x1="{CX + r1 * math.cos(t):.1f}" y1="{CY + r1 * math.sin(t):.1f}" x2="{CX + r2 * math.cos(t):.1f}" y2="{CY + r2 * math.sin(t):.1f}" '
                 f'stroke="{GOLD_LIGHT if year == 2026 else GOLD}" stroke-opacity="{op}" stroke-width="{1.5 if long else 0.9}" stroke-linecap="round"/>')
    p.append(f'<circle cx="{CX}" cy="{CY}" r="{DISC}" fill="url(#heart)"/>')
    p.append(f'<circle cx="{CX}" cy="{CY}" r="{DISC}" fill="none" stroke="url(#gold)" stroke-width="1.5"/>')
    p.append(f'<circle cx="{CX}" cy="{CY}" r="{DISC - 9}" fill="none" stroke="{GOLD}" stroke-opacity="0.35" stroke-width="0.7"/>')
    return "\n".join(p)


def page(center_html: str, block_html: str) -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: Gloock; src: url('{FONTS}Gloock-Regular.ttf'); }}
@font-face {{ font-family: InstrumentSerif; font-style: italic; src: url('{FONTS}InstrumentSerif-Italic.ttf'); }}
@font-face {{ font-family: Jura; src: url('{FONTS}Jura-Light.ttf'); }}
@font-face {{ font-family: DMMono; src: url('{FONTS}DMMono-Regular.ttf'); }}
@font-face {{ font-family: WorkSans; src: url('{FONTS}WorkSans-Regular.ttf'); }}
html, body {{ margin: 0; width: {W}px; height: {H}px; overflow: hidden; }}
body {{ position: relative; background: radial-gradient(ellipse 720px 560px at {CX}px {CY}px, #11523d 0%, #0b4031 38%, #072d22 72%, #04201a 100%); }}
body::after {{ content: ""; position: absolute; inset: 0; background: radial-gradient(ellipse at 45% 50%, transparent 58%, rgba(0,0,0,.3) 100%); }}
svg.bg {{ position: absolute; inset: 0; }}
.center {{ position: absolute; left: {CX - DISC}px; top: {CY - DISC}px; width: {DISC * 2}px; height: {DISC * 2}px; z-index: 2;
  display: flex; flex-direction: column; align-items: center; justify-content: center; }}
.num {{ font-family: Gloock; font-size: 92px; line-height: 1; letter-spacing: -2px;
  background: linear-gradient(180deg, {GOLD_LIGHT}, {GOLD} 62%, #a7832f); -webkit-background-clip: text; background-clip: text; color: transparent; }}
.sub {{ font-family: Jura; font-size: 11px; letter-spacing: 5px; color: {MINT}; margin-top: 8px; padding-left: 5px; }}
.block {{ position: absolute; left: 72px; top: 0; width: 640px; height: {H}px; z-index: 2; display: flex; flex-direction: column; justify-content: center; }}
.eyebrow {{ font-family: Jura; font-size: 14px; letter-spacing: 5px; color: {MINT}; margin-bottom: 26px; }}
.en {{ font-family: InstrumentSerif; font-style: italic; font-size: 70px; line-height: 1.02; color: {CREAM}; }}
.bn {{ font-family: 'Shonar Bangla', 'Nirmala UI', sans-serif; font-weight: 700; font-size: 44px; line-height: 1.25; margin-top: 8px;
  background: linear-gradient(180deg, {GOLD_LIGHT} 10%, {GOLD} 70%, #a7832f); -webkit-background-clip: text; background-clip: text; color: transparent; }}
.rule {{ width: 80px; height: 2px; margin: 26px 0 20px; background: linear-gradient(90deg, {GOLD_LIGHT}, {GOLD}); }}
.line {{ font-family: WorkSans; font-size: 21px; line-height: 1.5; color: rgba(244,237,219,.88); max-width: 560px; }}
.foot {{ position: absolute; left: 72px; bottom: 40px; z-index: 2; font-family: DMMono; font-size: 13px; letter-spacing: 2px; color: rgba(169,216,194,.75); }}
</style></head><body>
<svg class="bg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg"><defs>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{GOLD_LIGHT}"/><stop offset="1" stop-color="#a7832f"/></linearGradient>
<radialGradient id="heart" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stop-color="#0f4a38"/><stop offset="1" stop-color="#062b20"/></radialGradient>
</defs>{rings()}</svg>
<div class="center">{center_html}</div>
{block_html}
<div class="foot">SABUJ SHIKSHAYATAN GOVT. HIGH SCHOOL · SITAKUNDA · SINCE 1976</div>
</body></html>"""


def block(en: str, bn: str, line: str) -> str:
    return f"""<div class="block"><div class="eyebrow">PRAKTAN SABUJIAN PARISHAD</div>
<div class="en">{en}</div><div class="bn">{bn}</div><div class="rule"></div><div class="line">{line}</div></div>"""


def render(name: str, html: str, png_out: Path, jpg: bool = True) -> None:
    src = HERE / f"_{name}.html"
    shot = HERE / f"_{name}.png"
    src.write_text(html, encoding="utf-8")
    subprocess.run([EDGE, "--headless=new", f"--user-data-dir={Path(tempfile.gettempdir()) / 'sshs-edge-profile'}", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
                    f"--window-size={W},{H}", f"--screenshot={shot}", src.as_uri()], check=True, capture_output=True, timeout=120)
    # Edge can return before the screenshot is on disk; give it a moment.
    for _ in range(60):
        if shot.exists() and shot.stat().st_size > 0:
            break
        time.sleep(0.5)
    time.sleep(0.5)
    im = Image.open(shot).convert("RGB").resize((W, H), Image.LANCZOS)
    if jpg:
        im.save(png_out, quality=88, optimize=True, progressive=True)
    else:
        im.save(png_out, optimize=True)
    src.unlink()
    shot.unlink()
    print(png_out.name, png_out.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    only = sys.argv[1:]
    for key, en, bn, line, icon in CARDS:
        if only and key not in only:
            continue
        render(key, page(icon_svg(icon, 96), block(en, bn, line)), OUT / f"{key}.jpg")
    # The Golden Jubilee: "50" in the emblem, the date and place.
    if not only or "jubilee" in only:
        render("jubilee", page('<div class="num">50</div><div class="sub">YEARS</div>',
                           block("Golden Jubilee", "সুবর্ণ জয়ন্তী ২০২৬", "Around 26 December 2026 (date to be confirmed) · School campus, Sitakunda. Register online.")),
               OUT / "jubilee.jpg")
    # Batch cards: the emblem and footer only; app/batches/[year]/opengraph-image.tsx adds the year and the text.
    if only and "batch-bg" not in only:
        raise SystemExit
    # The eyebrow sits where it does on the other cards; the generated title starts at y = 236.
    render("batch-bg", page("", '<div class="block" style="justify-content:flex-start;padding-top:172px;box-sizing:border-box"><div class="eyebrow">PRAKTAN SABUJIAN PARISHAD</div></div>'),
           OUT / "batch-bg.png", jpg=False)
