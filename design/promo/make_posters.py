"""Golden Jubilee 2026 promotion posters for Facebook, Instagram and WhatsApp.

Four designs, each as a square feed post (1080 x 1080) and a story / reel (1080 x 1920):
  1. registration-open   fees by batch, guests, payment, deadline
  2. how-to-register     three steps
  3. whats-included      programme and what members receive
  4. deadline            "last date 30 November"
Run: python design/promo/make_posters.py   (Windows fonts for Bangla; Playwright Chromium renders)
Facts below match Admin -> Events; change them here when the committee changes them.
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
BN = "'Shonar Bangla', 'Nirmala UI', sans-serif"

# ---- facts
# The day is not fixed yet: always "about".
DATE = "আনুমানিক ২৬ ডিসেম্বর ২০২৬"
VENUE = "বিদ্যালয় প্রাঙ্গণ, সীতাকুণ্ড"
DEADLINE = "৩০ নভেম্বর ২০২৬"
LINK_LINE = "রেজিস্ট্রেশন লিংক কমেন্টে · ফেসবুক গ্রুপ: SSHS Alumni Association"


def shell(w: int, h: int, body: str, emblem_y: int, scale: float, safe: int, k: float = 1.0) -> str:
    """Green background, the growth-ring 50 emblem, a header and a footer around `body`."""
    cards.CX, cards.CY = w // 2, emblem_y
    cards.DISC, cards.BARK = round(104 * scale), round(214 * scale)
    rings = cards.rings()
    disc = cards.DISC
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: InstrumentSerif; font-style: italic; src: url('{FONTS}InstrumentSerif-Italic.ttf'); }}
html, body {{ margin: 0; width: {w}px; height: {h}px; overflow: hidden; }}
body {{ position: relative; color: {CREAM}; font-family: {BN};
  background: radial-gradient(ellipse {w}px {round(h * .8)}px at {w // 2}px {emblem_y}px, #11523d 0%, #0b4031 40%, #072d22 74%, #04201a 100%); }}
svg {{ position: absolute; inset: 0; }}
.center {{ position: absolute; left: {w // 2 - disc}px; top: {emblem_y - disc}px; width: {disc * 2}px; height: {disc * 2}px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; }}
.num {{ font-weight: 700; font-size: {round(170 * scale / 1.6)}px; line-height: 1;
  background: linear-gradient(180deg, {GOLD_LIGHT}, {GOLD} 62%, #a7832f); -webkit-background-clip: text; background-clip: text; color: transparent; }}
.yrs {{ font-weight: 700; font-size: {max(14, round(30 * scale / 1.6))}px; color: {MINT}; margin-top: 4px; }}
.wrap {{ position: absolute; left: 70px; right: 70px; top: {emblem_y + disc + round(110 * scale)}px; bottom: {safe}px;
  display: flex; flex-direction: column; align-items: center; text-align: center; }}
.school {{ font-size: {round(34 * k)}px; color: #d7ebe1; }}
.title {{ font-weight: 700; font-size: {round(84 * k)}px; line-height: 1.1; margin-top: {round(4 * k)}px;
  background: linear-gradient(180deg, {GOLD_LIGHT} 10%, {GOLD} 70%, #a7832f); -webkit-background-clip: text; background-clip: text; color: transparent; }}
.en {{ font-family: InstrumentSerif; font-style: italic; font-size: {round(40 * k)}px; color: {CREAM}; opacity: .92; }}
.facts {{ font-size: {round(32 * k)}px; color: rgba(244,237,219,.9); margin-top: {round(8 * k)}px; }}
.card {{ width: 100%; margin-top: {round(26 * k)}px; background: rgba(4, 32, 26, .55); border: {round(2 * k)}px solid rgba(212,167,44,.55); border-radius: {round(28 * k)}px; padding: {round(24 * k)}px {round(34 * k)}px; box-sizing: border-box; }}
.row {{ display: flex; justify-content: space-between; align-items: baseline; gap: {round(20 * k)}px; padding: {round(10 * k)}px 0; border-bottom: {round(1 * k)}px solid rgba(244,237,219,.14); font-size: {round(38 * k)}px; }}
.row:last-child {{ border-bottom: 0; }}
.row b {{ color: {GOLD_LIGHT}; font-size: {round(46 * k)}px; white-space: nowrap; }}
.small {{ font-size: {round(27 * k)}px; color: rgba(244,237,219,.75); margin-top: {round(6 * k)}px; }}
.cta {{ margin-top: auto; display: inline-block; padding: {round(20 * k)}px {round(52 * k)}px; border-radius: {round(24 * k)}px; background: linear-gradient(180deg, #f6dc8f, #e2b54a);
  font-weight: 700; font-size: {round(42 * k)}px; color: #0b2a1f; box-shadow: 0 {round(10 * k)}px {round(30 * k)}px rgba(0,0,0,.35); }}
.foot {{ margin-top: {round(14 * k)}px; font-size: {round(26 * k)}px; color: rgba(244,237,219,.8); }}
.step {{ display: flex; gap: {round(24 * k)}px; align-items: flex-start; text-align: left; padding: {round(14 * k)}px 0; }}
.step .n {{ flex-shrink: 0; width: {round(72 * k)}px; height: {round(72 * k)}px; border-radius: 50%; background: linear-gradient(180deg, #f6dc8f, #e2b54a); color: #0b2a1f;
  font-weight: 700; font-size: {round(42 * k)}px; display: flex; align-items: center; justify-content: center; }}
.step .t {{ font-size: {round(42 * k)}px; font-weight: 700; color: {GOLD_LIGHT}; line-height: 1.2; }}
.step .d {{ font-size: {round(30 * k)}px; color: rgba(244,237,219,.86); line-height: 1.35; margin-top: {round(2 * k)}px; }}
.grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: {round(10 * k)}px {round(26 * k)}px; text-align: left; font-size: {round(34 * k)}px; }}
.grid div::before {{ content: "✦ "; color: {GOLD}; }}
.label {{ font-size: {round(30 * k)}px; color: {MINT}; font-weight: 700; margin: {round(18 * k)}px 0 {round(10 * k)}px; letter-spacing: .02em; }}
.big {{ font-weight: 700; font-size: {round(150 * k)}px; line-height: 1; margin-top: {round(10 * k)}px;
  background: linear-gradient(180deg, {GOLD_LIGHT}, {GOLD} 62%, #a7832f); -webkit-background-clip: text; background-clip: text; color: transparent; }}
</style></head><body>
<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg"><defs>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{GOLD_LIGHT}"/><stop offset="1" stop-color="#a7832f"/></linearGradient>
<radialGradient id="heart" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stop-color="#0f4a38"/><stop offset="1" stop-color="#062b20"/></radialGradient>
</defs>{rings}</svg>
<div class="center"><div class="num">৫০</div>{'<div class="yrs">বছর · ১৯৭৬–২০২৬</div>' if scale >= 0.5 else ''}</div>
<div class="wrap">{body}</div>
</body></html>"""


HEAD = f"""<div class="school">সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়</div>"""


def registration_open(story: bool) -> str:
    return f"""{HEAD}
<div class="title">রেজিস্ট্রেশন চলছে!</div>
<div class="en">Golden Jubilee 2026 · registration is open</div>
<div class="facts">{DATE} · {VENUE}</div>
<div class="card">
  <div class="row"><span>এসএসসি ব্যাচ ১৯৮৯–২০১৪</span><b>৳১,৫০০</b></div>
  <div class="row"><span>এসএসসি ব্যাচ ২০১৫–২০২৬</span><b>৳১,২৫০</b></div>
  <div class="row"><span>স্বামী / স্ত্রী</span><b>৳৬০০</b></div>
  <div class="row"><span>সন্তান (৫ বছর বা তদূর্ধ্ব)</span><b>৳৬০০</b></div>
  <div class="small">৫ বছরের কম বয়সী শিশু ফ্রি · পেমেন্ট: বাংলা QR অথবা নগদ টাকা</div>
</div>
<div class="facts" style="margin-top:{22 if story else 14}px">রেজিস্ট্রেশনের শেষ সময়: <b style="color:{GOLD_LIGHT}">{DEADLINE}</b></div>
<div class="cta">এখনই রেজিস্ট্রেশন করুন</div>
<div class="foot">{LINK_LINE}</div>"""


def how_to(story: bool) -> str:
    steps = [
        ("তথ্য দিন", "নাম, এসএসসি ব্যাচ, ছবি আর বিদ্যালয়ের প্রমাণপত্র (সনদ / মার্কশিট)"),
        ("মোবাইল নম্বর যাচাই", "SMS-এ আসা ৪ সংখ্যার কোড দিন · একটি নম্বরে একটি রেজিস্ট্রেশন"),
        ("পেমেন্ট করুন", "বাংলা QR স্ক্যান করে টাকা দিন, তারপর ট্রানজেকশন আইডি লিখুন"),
    ]
    rows = "".join(f'<div class="step"><div class="n">{"১২৩"[i]}</div><div><div class="t">{t}</div><div class="d">{d}</div></div></div>' for i, (t, d) in enumerate(steps))
    return f"""{HEAD}
<div class="title">৩ ধাপে রেজিস্ট্রেশন</div>
<div class="en">Register in 3 easy steps</div>
<div class="card" style="padding:{18 if story else 10}px 34px">{rows}</div>
<div class="facts" style="margin-top:16px">কমিটি নিশ্চিত করলেই SMS ও ইমেইলে খবর, ড্যাশবোর্ডে টিকিট</div>
<div class="cta">এখনই রেজিস্ট্রেশন করুন</div>
<div class="foot">{LINK_LINE}</div>"""


def whats_included(story: bool) -> str:
    programme = ["জুবিলি র‍্যালি", "পতাকা উত্তোলন", "শিক্ষক সম্মাননা", "ব্যাচ পুনর্মিলনী", "সাংস্কৃতিক অনুষ্ঠান", "র‍্যাফেল ড্র"]
    kit = ["সকালের নাস্তা", "দুপুরের খাবার", "বিরিয়ানি ডিনার", "জুবিলি টি-শার্ট", "স্যুভেনির বই", "ক্রেস্ট ও উপহার"]
    grid = lambda items: '<div class="grid">' + "".join(f"<div>{x}</div>" for x in items) + "</div>"
    return f"""{HEAD}
<div class="title">যা থাকছে</div>
<div class="en">One day, fifty years · {DATE}</div>
<div class="card">
  <div class="label">অনুষ্ঠানসূচি</div>{grid(programme)}
  <div class="label" style="margin-top:{26 if story else 16}px">রেজিস্ট্রেশনে পাচ্ছেন</div>{grid(kit)}
</div>
<div class="cta">এখনই রেজিস্ট্রেশন করুন</div>
<div class="foot">{LINK_LINE}</div>"""


def deadline(story: bool) -> str:
    return f"""{HEAD}
<div class="title">শেষ সময়</div>
<div class="big">৩০ নভেম্বর</div>
<div class="en" style="margin-top:8px">Registration closes 30 November 2026</div>
<div class="facts" style="margin-top:24px">সুবর্ণ জয়ন্তী ২০২৬ · {DATE}<br>{VENUE}</div>
<div class="card" style="margin-top:28px">
  <div class="row"><span>ব্যাচ ১৯৮৯–২০১৪</span><b>৳১,৫০০</b></div>
  <div class="row"><span>ব্যাচ ২০১৫–২০২৬</span><b>৳১,২৫০</b></div>
</div>
<div class="cta">আজই রেজিস্ট্রেশন করুন</div>
<div class="foot">{LINK_LINE}</div>"""


DESIGNS = {
    "registration-open": registration_open,
    "how-to-register": how_to,
    "whats-included": whats_included,
    "deadline": deadline,
}


def render(page, name: str, html: str, w: int, h: int) -> None:
    src, shot = HERE / f"_{name}.html", HERE / f"_{name}.png"
    src.write_text(html, encoding="utf-8")
    page.set_viewport_size({"width": w, "height": h})
    page.goto(src.as_uri(), wait_until="load")
    page.evaluate("document.fonts.ready")
    page.screenshot(path=str(shot))
    out = HERE / f"{name}.jpg"
    Image.open(shot).convert("RGB").save(out, quality=90, optimize=True, progressive=True)
    src.unlink()
    shot.unlink()
    print(out.name, out.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    # Playwright's Chromium (pip install playwright; playwright install chromium) with the Windows Bangla fonts.
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        for key, build in DESIGNS.items():
            # Square feed post: small emblem on top.
            render(page, f"{key}-1080x1080", shell(1080, 1080, build(False), 112, 0.40, 34, 0.9), 1080, 1080)
            # Story / reel: the top and bottom 250 px stay clear of the app's own buttons.
            render(page, f"{key}-story-1080x1920", shell(1080, 1920, build(True), 420, 0.72, 260, 1.3), 1080, 1920)
        browser.close()
