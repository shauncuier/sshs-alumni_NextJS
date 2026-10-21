"""Facebook / Instagram ad images for the Golden Jubilee registration link (/jubilee).

Writes design/facebook-ads/jubilee-feed-1080x1080.jpg and jubilee-story-1080x1920.jpg,
in the share-card design (growth-ring emblem, green and gold), Bangla first.
Run: python design/facebook-ads/make_ads.py
"""
import importlib.util
import subprocess
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("cards", HERE.parent / "share-cards" / "make_cards.py")
cards = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cards)

FONTS, EDGE = cards.FONTS, cards.EDGE
GOLD, GOLD_LIGHT, CREAM, MINT = cards.GOLD, cards.GOLD_LIGHT, cards.CREAM, cards.MINT


def page(w: int, h: int, cx: int, cy: int, scale: float, text_top: int) -> str:
    # The share cards' emblem, moved and scaled for this format.
    cards.CX, cards.CY = cx, cy
    cards.DISC, cards.BARK = round(104 * scale), round(214 * scale)
    rings = cards.rings()
    disc = cards.DISC
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: Gloock; src: url('{FONTS}Gloock-Regular.ttf'); }}
@font-face {{ font-family: InstrumentSerif; font-style: italic; src: url('{FONTS}InstrumentSerif-Italic.ttf'); }}
@font-face {{ font-family: Jura; src: url('{FONTS}Jura-Light.ttf'); }}
@font-face {{ font-family: WorkSans; src: url('{FONTS}WorkSans-Regular.ttf'); }}
html, body {{ margin: 0; width: {w}px; height: {h}px; overflow: hidden; }}
body {{ position: relative; background: radial-gradient(ellipse {w}px {round(h * .7)}px at {cx}px {cy}px, #11523d 0%, #0b4031 38%, #072d22 72%, #04201a 100%); }}
svg {{ position: absolute; inset: 0; }}
.center {{ position: absolute; left: {cx - disc}px; top: {cy - disc}px; width: {disc * 2}px; height: {disc * 2}px; display: flex; flex-direction: column; align-items: center; justify-content: center; }}
.num {{ font-family: 'Shonar Bangla', 'Nirmala UI', sans-serif; font-weight: 700; font-size: {round(170 * scale / 1.6)}px; line-height: 1;
  background: linear-gradient(180deg, {GOLD_LIGHT}, {GOLD} 62%, #a7832f); -webkit-background-clip: text; background-clip: text; color: transparent; }}
.yrs {{ font-family: 'Shonar Bangla', 'Nirmala UI', sans-serif; font-weight: 700; font-size: {round(30 * scale / 1.6)}px; color: {MINT}; margin-top: 6px; }}
.text {{ position: absolute; left: 0; right: 0; top: {text_top}px; text-align: center; padding: 0 70px; }}
.eyebrow {{ font-family: 'Shonar Bangla', 'Nirmala UI', sans-serif; font-size: 36px; color: #d7ebe1; }}
.title {{ font-family: 'Shonar Bangla', 'Nirmala UI', sans-serif; font-weight: 700; font-size: 104px; line-height: 1.12; margin-top: 6px;
  background: linear-gradient(180deg, {GOLD_LIGHT} 10%, {GOLD} 70%, #a7832f); -webkit-background-clip: text; background-clip: text; color: transparent; }}
.en {{ font-family: InstrumentSerif; font-style: italic; font-size: 52px; color: {CREAM}; margin-top: 2px; }}
.facts {{ font-family: 'Shonar Bangla', 'Nirmala UI', sans-serif; font-size: 38px; color: rgba(244,237,219,.92); margin-top: 26px; line-height: 1.45; }}
.fee {{ display: inline-block; margin-top: 22px; padding: 10px 30px; border: 2px solid {GOLD}; border-radius: 999px;
  font-family: 'Shonar Bangla', 'Nirmala UI', sans-serif; font-size: 36px; color: {GOLD_LIGHT}; }}
.cta {{ display: inline-block; margin-top: 30px; padding: 22px 56px; border-radius: 24px; background: linear-gradient(180deg, #f6dc8f, #e2b54a);
  font-family: 'Shonar Bangla', 'Nirmala UI', sans-serif; font-weight: 700; font-size: 46px; color: #0b2a1f; box-shadow: 0 10px 30px rgba(0,0,0,.35); }}
</style></head><body>
<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg"><defs>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{GOLD_LIGHT}"/><stop offset="1" stop-color="#a7832f"/></linearGradient>
<radialGradient id="heart" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stop-color="#0f4a38"/><stop offset="1" stop-color="#062b20"/></radialGradient>
</defs>{rings}</svg>
<div class="center"><div class="num">৫০</div><div class="yrs">বছর · ১৯৭৬–২০২৬</div></div>
<div class="text">
  <div class="eyebrow">সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়</div>
  <div class="title">সুবর্ণ জয়ন্তী ২০২৬</div>
  <div class="en">Golden Jubilee · 50 years</div>
  <div class="facts">আনুমানিক ২৬ ডিসেম্বর ২০২৬ (তারিখ চূড়ান্ত হয়নি)<br>বিদ্যালয় প্রাঙ্গণ, সীতাকুণ্ড</div>
  <div class="fee">রেজিস্ট্রেশন ফি ৳১,২৫০–১,৫০০</div><br>
  <div class="cta">এখনই রেজিস্ট্রেশন করুন</div>
</div>
</body></html>"""


def render(name: str, html: str, w: int, h: int) -> None:
    src, shot = HERE / f"_{name}.html", HERE / f"_{name}.png"
    src.write_text(html, encoding="utf-8")
    subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                    f"--window-size={w},{h}", f"--screenshot={shot}", src.as_uri()], check=True, capture_output=True, timeout=120)
    out = HERE / f"{name}.jpg"
    Image.open(shot).convert("RGB").save(out, quality=90, optimize=True, progressive=True)
    src.unlink()
    shot.unlink()
    print(out.name, out.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    # Feed (square): emblem on top, text below.
    render("jubilee-feed-1080x1080", page(1080, 1080, 540, 222, 0.8, 418), 1080, 1080)
    # Stories / Reels: emblem high, text in the middle (top and bottom 250 px stay clear of the app's own buttons).
    render("jubilee-story-1080x1920", page(1080, 1920, 540, 650, 1.25, 990), 1080, 1920)
