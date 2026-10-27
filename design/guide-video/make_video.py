"""Golden Jubilee 2026 registration guide video (vertical 1080 x 1920, for Facebook, WhatsApp, YouTube Shorts).

Steps:
  1. npx tsx --env-file=.env.local design/guide-video/demo-data.ts start
  2. python design/guide-video/capture.py          (dev server on :3000; real /jubilee form, sample data)
  3. npx tsx --env-file=.env.local design/guide-video/demo-data.ts cleanup
  4. python design/guide-video/make_video.py       -> design/guide-video/jubilee-registration-guide.mp4
Captions are Bangla first with an English line; change SCENES below to edit them.
"""
import base64
import shutil
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
SHOTS = HERE / "shots"
FRAMES = HERE / "_frames"
OUT = HERE / "jubilee-registration-guide.mp4"
FFMPEG = shutil.which("ffmpeg") or str(
    Path.home() / "AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.2-full_build/bin/ffmpeg.exe"
)
GOLD, GOLD_LIGHT, CREAM = "#d4a72c", "#f1cf72", "#f4eddb"
FADE = 0.45

# (screenshot or None, step label, Bangla heading, English line, seconds)
SCENES = [
    (None, "", "অনলাইন রেজিস্ট্রেশন গাইড", "Golden Jubilee 2026 · how to register online, step by step", 4.0),
    ("01-open-link", "ধাপ ১", "রেজিস্ট্রেশন লিংকে ঢুকুন", "Open the registration link from the Facebook post or group", 4.0),
    ("02-fees", "ধাপ ২", "আপনার ব্যাচের ফি দেখে Register now চাপুন", "Check the fee for your SSC batch, then tap Register now", 4.5),
    ("03-photo", "ধাপ ৩", "নিজের একটি স্পষ্ট ছবি দিন", "Add a clear photo of your face", 4.0),
    ("04-name-email-password", "ধাপ ৪", "নাম, ইমেইল ও পাসওয়ার্ড লিখুন", "Your name, email and a password (8+ characters) to sign in later", 4.5),
    ("05-mobile", "ধাপ ৫", "মোবাইল নম্বর লিখে Send code চাপুন", "Type your mobile number and tap Send code", 4.0),
    ("06-sms-code", "ধাপ ৬", "SMS-এ আসা ৪ সংখ্যার কোড দিন", "Enter the 4-digit code from the SMS and tap Verify", 4.5),
    ("07-verified", "", "নম্বর যাচাই হয়েছে ✓", "Number verified. One registration per mobile number", 3.5),
    ("08-batch", "ধাপ ৭", "এসএসসি ব্যাচ বেছে নিন", "Choose your SSC batch: the fee depends on it. Roll, section and blood group are optional", 5.0),
    ("09-proof", "ধাপ ৮", "বিদ্যালয়ের প্রমাণপত্র দিন", "Upload your SSC certificate or marksheet (photo or PDF), then tap Continue", 5.0),
    ("10-guests", "ধাপ ৯", "পরিবারের সদস্য ও টি-শার্ট সাইজ", "Add spouse and children (5 years or older) and your T-shirt size. The total updates", 5.0),
    ("11-bangla-qr", "ধাপ ১০", "বাংলা QR স্ক্যান করে টাকা দিন", "Choose Bangla QR, scan it with bKash, Nagad or your bank app and pay the total", 5.5),
    ("12-transaction-id", "ধাপ ১১", "ট্রানজেকশন আইডি (TrxID) লিখুন", "Type the transaction ID from your payment receipt", 4.5),
    ("13-submit", "ধাপ ১২", "Register বাটনে চাপুন", "Tap Join Alumni Association & Register", 4.0),
    ("14-done", "", "রেজিস্ট্রেশন জমা হয়েছে!", "Done. The committee now checks your payment", 4.0),
    (None, "outro", "এরপর কী হবে?", "", 7.0),
]

STEPS = sum(1 for s in SCENES if s[1].startswith("ধাপ"))


def b64(path: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def frame_html(shot: str | None, label: str, bn: str, en: str, index: int) -> str:
    style = f"""<style>
html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; }}
body {{ font-family: 'Shonar Bangla', 'Nirmala UI', 'Segoe UI', sans-serif; color: {CREAM};
  background: radial-gradient(ellipse 1300px 1500px at 540px 760px, #11523d 0%, #0b4031 42%, #072d22 76%, #04201a 100%); }}
.top {{ position: absolute; left: 60px; right: 60px; top: 70px; text-align: center; }}
.badge {{ display: inline-block; padding: 8px 26px; border-radius: 999px; background: linear-gradient(180deg, #f6dc8f, #e2b54a); color: #0b2a1f; font-weight: 700; font-size: 36px; }}
.bn {{ font-weight: 700; font-size: 62px; line-height: 1.18; margin-top: 18px; color: {GOLD_LIGHT}; }}
.en {{ font-family: 'Segoe UI', sans-serif; font-size: 31px; line-height: 1.3; margin-top: 10px; color: {CREAM}; opacity: .92; }}
.phone {{ position: absolute; left: 50%; bottom: 140px; transform: translateX(-50%); height: 1390px; aspect-ratio: 1071 / 2236;
  border: 14px solid #0d1512; border-radius: 56px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.55), 0 0 0 3px {GOLD}; background: #fff; }}
.phone img {{ width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }}
.foot {{ position: absolute; left: 0; right: 0; bottom: 58px; text-align: center; font-size: 28px; color: rgba(244,237,219,.8); }}
.bar {{ position: absolute; left: 120px; right: 120px; bottom: 112px; height: 8px; border-radius: 8px; background: rgba(244,237,219,.15); }}
.bar i {{ display: block; height: 100%; border-radius: 8px; background: linear-gradient(90deg, {GOLD}, {GOLD_LIGHT}); }}
.card {{ position: absolute; left: 80px; right: 80px; top: 470px; background: rgba(4,32,26,.6); border: 3px solid rgba(212,167,44,.6); border-radius: 40px; padding: 46px 52px; }}
.item {{ display: flex; gap: 26px; align-items: flex-start; margin: 26px 0; }}
.item .n {{ flex-shrink: 0; width: 76px; height: 76px; border-radius: 50%; background: linear-gradient(180deg, #f6dc8f, #e2b54a); color: #0b2a1f; font-weight: 700; font-size: 40px; display: flex; align-items: center; justify-content: center; }}
.item .t {{ font-size: 44px; font-weight: 700; color: {GOLD_LIGHT}; line-height: 1.2; }}
.item .d {{ font-family: 'Segoe UI', sans-serif; font-size: 28px; color: rgba(244,237,219,.85); margin-top: 4px; }}
.title50 {{ font-weight: 700; font-size: 260px; line-height: 1; background: linear-gradient(180deg, {GOLD_LIGHT}, {GOLD} 62%, #a7832f); -webkit-background-clip: text; background-clip: text; color: transparent; }}
</style>"""
    done = sum(1 for s in SCENES[: index + 1] if s[1].startswith("ধাপ"))
    progress = f'<div class="bar"><i style="width:{round(100 * done / STEPS)}%"></i></div>'
    foot = '<div class="foot">সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয় · প্রাক্তন সবুজিয়ান পরিষদ</div>'
    if shot:
        body = f"""<div class="top">{f'<div class="badge">{label}</div>' if label else ''}<div class="bn">{bn}</div><div class="en">{en}</div></div>
<div class="phone"><img src="{b64(SHOTS / f'{shot}.png')}"></div>{progress}{foot}"""
    elif label == "outro":
        items = [
            ("১", "কমিটি পেমেন্ট যাচাই করবে", "The committee checks your payment and proof"),
            ("২", "SMS ও ইমেইলে নিশ্চিতকরণ", "You get an SMS and an email when it is confirmed"),
            ("৩", "ড্যাশবোর্ডে টিকিট ও পেমেন্ট স্লিপ", "Sign in: your ticket QR and payment slip are on the dashboard"),
            ("৪", "অনুষ্ঠানের দিন টিকিট দেখিয়ে প্রবেশ", "On the day, show the ticket at the gate"),
        ]
        rows = "".join(f'<div class="item"><div class="n">{n}</div><div><div class="t">{t}</div><div class="d">{d}</div></div></div>' for n, t, d in items)
        body = f"""<div class="top"><div class="bn" style="font-size:76px">{bn}</div><div class="en">What happens next</div></div>
<div class="card">{rows}</div>
<div class="top" style="top:1430px"><div class="en" style="font-size:34px">রেজিস্ট্রেশনের শেষ সময় <b style="color:{GOLD_LIGHT}">৩০ নভেম্বর ২০২৬</b></div>
<div class="en" style="font-size:28px;margin-top:22px">Help: info@exsabujian.org · Facebook group: SSHS Alumni Association</div></div>{foot}"""
    else:
        body = f"""<div class="top" style="top:330px"><div class="title50">৫০</div>
<div class="bn" style="font-size:96px;margin-top:10px">সুবর্ণ জয়ন্তী ২০২৬</div>
<div class="en" style="font-size:36px">Sabuj Shikshayatan Government High School</div>
<div class="badge" style="margin-top:70px;font-size:44px;padding:16px 40px">{bn}</div>
<div class="en" style="margin-top:28px;font-size:34px">{en}</div>
<div class="en" style="margin-top:60px;font-size:34px">আনুমানিক ২৬ ডিসেম্বর ২০২৬ · বিদ্যালয় প্রাঙ্গণ, সীতাকুণ্ড</div></div>{foot}"""
    return f"<!doctype html><html><head><meta charset='utf-8'>{style}</head><body>{body}</body></html>"


def render_frames() -> list[Path]:
    from playwright.sync_api import sync_playwright

    FRAMES.mkdir(exist_ok=True)
    out = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1080, "height": 1920})
        for i, (shot, label, bn, en, _sec) in enumerate(SCENES):
            html = FRAMES / f"{i:02d}.html"
            html.write_text(frame_html(shot, label, bn, en, i), encoding="utf-8")
            page.goto(html.as_uri(), wait_until="load")
            page.evaluate("document.fonts.ready")
            png = FRAMES / f"{i:02d}.png"
            page.screenshot(path=str(png))
            html.unlink()
            out.append(png)
        browser.close()
    return out


def encode(frames: list[Path]) -> None:
    durations = [s[4] for s in SCENES]
    args = [FFMPEG, "-y", "-hide_banner", "-loglevel", "error"]
    for f, d in zip(frames, durations):
        args += ["-loop", "1", "-framerate", "30", "-t", f"{d + FADE:.2f}", "-i", str(f)]
    args += ["-f", "lavfi", "-t", f"{sum(durations) + FADE:.2f}", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"]
    # Cross-fade each scene into the next: every input runs FADE longer than its scene,
    # so the next fade starts at the sum of the scene lengths so far.
    chain = []
    prev, t = "[0:v]", durations[0]
    for i in range(1, len(frames)):
        label = f"[v{i}]"
        chain.append(f"{prev}[{i}:v]xfade=transition=fade:duration={FADE}:offset={t:.2f}{label}")
        prev, t = label, t + durations[i]
    chain.append(f"{prev}format=yuv420p[out]")
    args += ["-filter_complex", ";".join(chain), "-map", "[out]", "-map", f"{len(frames)}:a",
             "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", "30", "-c:a", "aac", "-b:a", "96k",
             "-shortest", "-movflags", "+faststart", str(OUT)]
    subprocess.run(args, check=True)


if __name__ == "__main__":
    frames = render_frames()
    encode(frames)
    shutil.rmtree(FRAMES, ignore_errors=True)
    print(OUT.name, f"{OUT.stat().st_size / 1_048_576:.1f} MB", f"{sum(s[4] for s in SCENES):.0f} s")
