import base64
import subprocess
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
VIDEOS_DIR = ROOT / "public" / "videos"
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR = ROOT / "scripts" / "_temp_video"
TEMP_DIR.mkdir(parents=True, exist_ok=True)
UI_DIR = ROOT / "public" / "docs" / "ui-screenshots"

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
FFMPEG = shutil.which("ffmpeg") or r"C:\Users\jashe\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.EXE"

def get_b64(path: Path) -> str:
    if not path.exists():
        return ""
    with open(path, "rb") as f:
        return f"data:image/png;base64,{base64.b64encode(f.read()).decode('utf-8')}"

SS_STEP1 = get_b64(UI_DIR / "ui_step1_account.png")
SS_STEP2 = get_b64(UI_DIR / "ui_step2_payment.png")
SS_CARD = get_b64(UI_DIR / "ui_card_preview.png")
SS_JUBILEE = get_b64(UI_DIR / "ui_mobile_jubilee.png")

slides = [
    {
        "id": "slide1",
        "duration": 6,
        "title": "Online Registration Guide",
        "subtitle": "অনলাইন নিবন্ধন ও সুবর্ণ জয়ন্তী ২০২৬",
        "eyebrow": "Sabuj Shikshayatan Govt. High School Alumni Association",
        "content": """
        <div class="hero-badge">OFFICIAL VIDEO TUTORIAL · নির্দেশিকা ভিডিও</div>
        <div class="hero-title">Golden Jubilee 2026 & Alumni Registration</div>
        <div class="hero-bangla">সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয় — ৫০ বছর পূর্তি উৎসব ও আজীবন সদস্যপদ</div>
        <div class="grid-3">
          <div class="stat-box">
            <div class="stat-num">01</div>
            <div class="stat-title">Fill Information</div>
            <div class="stat-desc">নাম, ব্যাচ ও অ্যাকাউন্টের তথ্য</div>
          </div>
          <div class="stat-box highlight">
            <div class="stat-num">02</div>
            <div class="stat-title">Upload Proof</div>
            <div class="stat-desc">ছবি ও এসএসসির সনদ/মার্কশিট</div>
          </div>
          <div class="stat-box">
            <div class="stat-num">03</div>
            <div class="stat-title">bKash / Nagad</div>
            <div class="stat-desc">সহজ ফি পরিশোধ ও ট্রানজেকশন আইডি</div>
          </div>
        </div>
        <div class="portal-link">🌐 Portal: <strong>ssghsalumni.org/register</strong> · বা <strong>/jubilee</strong></div>
        """
    },
    {
        "id": "slide2",
        "duration": 8,
        "title": "Step 1: Personal & Academic Info",
        "subtitle": "ধাপ ১: ব্যক্তিগত ও শিক্ষাগত তথ্য প্রদান (Real Portal UI)",
        "eyebrow": "STEP 1 OF 5 · প্রাথমিক তথ্য পূরণ",
        "content": f"""
        <div class="split-video-layout">
          <div class="ui-shot-container">
            <div class="browser-bar">
              <span class="browser-dots"><i></i><i></i><i></i></span>
              <span class="browser-url">ssghsalumni.org/register</span>
              <span class="real-ui-tag">REAL PORTAL UI</span>
            </div>
            <img src="{SS_STEP1}" class="video-ui-img" alt="Step 1 UI">
          </div>
          <div class="ui-info-side">
            <div class="feature-card">
              <h4>📝 ১. প্রয়োজনীয় তথ্যসমূহ:</h4>
              <ul class="video-list">
                <li><strong>Full Name:</strong> সার্টিফিকেট অনুযায়ী ইংরেজি নাম</li>
                <li><strong>SSC Batch:</strong> ১৯৭৭ থেকে ২০২৬ এর মধ্য থেকে আপনার পাসের বছর</li>
                <li><strong>Roll & Section:</strong> তৎকালীন রোল ও শাখা (ঐচ্ছিক)</li>
                <li><strong>Blood Group:</strong> রক্তের সঠিক গ্রুপ নির্বাচন</li>
                <li><strong>Phone & Email:</strong> সচল মোবাইল নম্বর (এসএমএস নোটিফিকেশন যাবে)</li>
                <li><strong>Password:</strong> ন্যূনতম ৬ অক্ষরের গোপন পাসওয়ার্ড</li>
              </ul>
            </div>
            <div class="tip-card" style="margin-top:16px;">
              <p>💡 ভুল ব্যাচ নির্বাচন করলে পরে ব্যাচমেটদের সাথে যুক্ত হতে জটিলতা হতে পারে, তাই সঠিক বছর নির্বাচন করুন।</p>
            </div>
          </div>
        </div>
        """
    },
    {
        "id": "slide3",
        "duration": 7,
        "title": "Step 2: Photo & Academic Proof",
        "subtitle": "ধাপ ২: ছবি ও প্রামাণ্য নথি আপলোড (Document Guidelines)",
        "eyebrow": "STEP 2 OF 5 · পরিচিতি ও ডকুমেন্ট",
        "content": """
        <div class="card-wrap">
          <div class="half-card">
            <div class="doc-icon">📷</div>
            <h3>১. প্রোফাইল ছবি (Profile Photo)</h3>
            <ul class="bullet-list">
              <li>পরিষ্কার পাসপোর্ট সাইজের ছবি আপলোড করুন</li>
              <li>ছবির সাইজ ন্যূনতম <strong>600 × 600 পিক্সেল</strong> হতে হবে</li>
              <li>সর্বোচ্চ সাইজ: <strong>5 MB</strong> (JPEG / PNG / WebP)</li>
              <li class="warning-text">⚠️ iPhone/Android HEIC ছবির ক্ষেত্রে স্ক্রিনশট নিয়ে আপলোড করুন</li>
              <li style="color:#94a3b8;font-size:18px;">এই ছবিটি আপনার ডিজিটাল আজীবন সদস্য আইডি কার্ডে যুক্ত থাকবে</li>
            </ul>
          </div>
          <div class="half-card">
            <div class="doc-icon">📜</div>
            <h3>২. প্রামাণ্য নথি (Study Proof Document)</h3>
            <ul class="bullet-list">
              <li>সবুজ শিক্ষায়তনে পড়ার প্রমাণপত্র আপলোড করুন</li>
              <li><strong>গ্রহণযোগ্য ডকুমেন্টস (যেকোনো একটি):</strong>
                <br>• SSC Certificate (সনদপত্র)
                <br>• SSC Marksheet / Transcript
                <br>• SSC Admit Card বা Registration Card
                <br>• School Leaving Certificate / Testimonial
              </li>
              <li>ফরম্যাট: PDF বা স্পষ্ট ছবি (সর্বোচ্চ 10 MB)</li>
            </ul>
          </div>
        </div>
        """
    },
    {
        "id": "slide4",
        "duration": 8,
        "title": "Step 3 & 4: Package & bKash / Nagad Payment",
        "subtitle": "ধাপ ৩ ও ৪: প্যাকেজ নির্বাচন এবং বিকাশ/নগদে ফি পরিশোধ (Real Checkout)",
        "eyebrow": "STEP 3 & 4 OF 5 · ফি পরিশোধ ও TrxID",
        "content": f"""
        <div class="split-video-layout">
          <div class="ui-info-side">
            <div class="feature-card">
              <h4>💳 ফি পরিশোধের নিয়মাবলি:</h4>
              <p style="font-size:20px;color:#e2e8f0;margin:0 0 10px 0;">গোল্ডেন জুবিলি ২০২৬ রেজিস্ট্রেশন ফি: <strong>৳১,৫০০</strong></p>
              <div class="pay-boxes" style="margin-bottom:14px;">
                <div class="pay-method bkash">bKash (বিকাশ)</div>
                <div class="pay-method nagad">Nagad (নগদ)</div>
                <div class="pay-method qr">Bangla QR</div>
              </div>
              <ul class="video-list">
                <li>স্ক্রিনে প্রদর্শিত কমিটির অফিসিয়াল অ্যাকাউন্টে Send Money বা Payment করুন</li>
                <li>বিকাশ/নগদ থেকে প্রাপ্ত <strong>Transaction ID (TrxID)</strong> ফর্মে টাইপ করুন</li>
                <li>পেমেন্টের স্ক্রিনশট আপলোড করুন</li>
              </ul>
              <div style="background:rgba(16,185,129,0.15);border:1px solid #10b981;border-radius:12px;padding:12px;margin-top:12px;">
                <strong style="color:#10b981;font-size:18px;">⚡ স্মার্ট OCR স্বয়ংক্রিয় স্ক্যান:</strong>
                <p style="margin:4px 0 0 0;font-size:16px;color:#d1fae5;">স্ক্রিনশট আপলোড করলেই ট্রানজেকশন আইডি স্বয়ংক্রিয়ভাবে শনাক্ত হয়ে যাবে!</p>
              </div>
            </div>
          </div>
          <div class="ui-shot-container">
            <div class="browser-bar">
              <span class="browser-dots"><i></i><i></i><i></i></span>
              <span class="browser-url">Payment & Verification</span>
              <span class="real-ui-tag">REAL CHECKOUT UI</span>
            </div>
            <img src="{SS_STEP2}" class="video-ui-img" alt="Step 2 UI">
          </div>
        </div>
        """
    },
    {
        "id": "slide5",
        "duration": 8,
        "title": "Step 5: Verification & Digital Card",
        "subtitle": "ধাপ ৫: অনুমোদন, ডিজিটাল আইডি কার্ড ও ইভেন্ট টিকিট (Real Card UI)",
        "eyebrow": "STEP 5 OF 5 · কার্ড ও টিকিট সংগ্রহ",
        "content": f"""
        <div class="split-video-layout" style="grid-template-columns: 1.1fr 1fr;">
          <div class="ui-shot-container">
            <div class="browser-bar">
              <span class="browser-dots"><i></i><i></i><i></i></span>
              <span class="browser-url">ssghsalumni.org/card</span>
              <span class="real-ui-tag" style="background:#3b82f6;">DIGITAL ALUMNI CARD</span>
            </div>
            <img src="{SS_CARD}" class="video-ui-img" style="max-height:540px;object-fit:cover;object-position:top;" alt="Card UI">
          </div>
          <div class="ui-info-side">
            <div class="half-card success-card" style="min-height:auto;padding:28px;">
              <div class="doc-icon" style="font-size:36px;margin-bottom:8px;">✅</div>
              <h3 style="font-size:24px;margin-bottom:12px;">কমিটি যাচাই ও অনুমোদন</h3>
              <p style="font-size:18px;line-height:1.5;">২৪ থেকে ৪৮ ঘণ্টার মধ্যে অডিট টিম আপনার পেমেন্ট ট্রানজেকশন ও সনদপত্র যাচাই করবে।</p>
              <div class="badge-status">Status: VERIFIED ALUMNI</div>
            </div>
            <div class="feature-card" style="margin-top:16px;">
              <h4>🎫 ড্যাশবোর্ড থেকে যা যা পাবেন:</h4>
              <ul class="video-list">
                <li><strong>ডিজিটাল মেম্বার আইডি কার্ড:</strong> আপনার ছবি ও ব্যাচ সংবলিত কার্ড</li>
                <li><strong>সুবর্ণ জয়ন্তী QR এন্ট্রি পাস:</strong> ভেন্যুতে দ্রুত এন্ট্রি ও উপহার কিট সংগ্রহের টিকিট</li>
              </ul>
            </div>
          </div>
        </div>
        """
    },
    {
        "id": "slide6",
        "duration": 6,
        "title": "Welcome to the Golden Jubilee!",
        "subtitle": "সুবর্ণ জয়ন্তী ২০২৬ এ আপনাকে স্বাগতম",
        "eyebrow": "HELP & SUPPORT · সার্বিক সহায়তা",
        "content": """
        <div class="closing-box">
          <div class="jubilee-badge">৫০ বছর পূর্তি উৎসব · ১৯৭৬–২০২৬</div>
          <div class="closing-title">স্মৃতির আঙিনায় ফিরে আসার দিন</div>
          <div class="closing-date">শনিবার, ২৬ ডিসেম্বর ২০২৬ · বিদ্যালয় প্রাঙ্গণ, সীতাকুণ্ড, চট্টগ্রাম</div>
          <div class="support-grid">
            <div class="support-item">
              <div class="sup-icon">🌐</div>
              <div class="sup-title">অনলাইন রেজিস্ট্রেশন লিংক</div>
              <div class="sup-val">ssghsalumni.org/register</div>
            </div>
            <div class="support-item">
              <div class="sup-icon">📄</div>
              <div class="sup-title">পূর্ণাঙ্গ পিডিএফ নির্দেশিকা</div>
              <div class="sup-val">ssghsalumni.org/docs/ssghs-registration-guide.pdf</div>
            </div>
            <div class="support-item">
              <div class="sup-icon">📞</div>
              <div class="sup-title">সহায়তা হেল্পলাইন ও হোয়াটসঅ্যাপ</div>
              <div class="sup-val">ওয়েবসাইটের Contact পেজ দেখুন</div>
            </div>
          </div>
        </div>
        """
    }
]

html_template = """<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    width: 1920px;
    height: 1080px;
    background: radial-gradient(circle at 80% 20%, #134e3a 0%, #062b20 50%, #031711 100%);
    font-family: 'Segoe UI', 'Nirmala UI', sans-serif;
    color: #f8fafc;
    overflow: hidden;
    position: relative;
    padding: 50px 80px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  
  .watermark {
    position: absolute;
    right: 80px;
    top: 50px;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    border: 3px solid #c9a24e;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(6, 43, 32, 0.85);
    box-shadow: 0 0 35px rgba(201, 162, 78, 0.25);
  }
  .wm-50 {
    font-size: 40px;
    font-weight: 800;
    line-height: 1;
    background: linear-gradient(180deg, #f6dc8f, #c9a24e);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .wm-sub {
    font-size: 12px;
    color: #a9d8c2;
    font-weight: 600;
    letter-spacing: 1px;
    margin-top: 2px;
  }

  .header {
    max-width: 1400px;
  }
  .eyebrow {
    font-size: 19px;
    font-weight: 700;
    color: #f6dc8f;
    letter-spacing: 2px;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .eyebrow::before {
    content: '';
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #f6dc8f;
  }
  .title {
    font-size: 52px;
    font-weight: 800;
    margin: 8px 0 4px 0;
    letter-spacing: -0.5px;
    color: #ffffff;
    text-shadow: 0 4px 16px rgba(0,0,0,0.4);
  }
  .subtitle {
    font-size: 28px;
    font-weight: 600;
    color: #93c5fd;
  }

  .main-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin: 20px 0;
  }

  /* Slide 1 Styles */
  .hero-badge {
    display: inline-block;
    padding: 8px 22px;
    background: rgba(201, 162, 78, 0.2);
    border: 2px solid #c9a24e;
    color: #f6dc8f;
    font-size: 19px;
    font-weight: 700;
    border-radius: 999px;
    letter-spacing: 1.5px;
    margin-bottom: 20px;
  }
  .hero-title {
    font-size: 60px;
    font-weight: 800;
    color: #ffffff;
    line-height: 1.15;
  }
  .hero-bangla {
    font-size: 34px;
    color: #cbd5e1;
    margin-top: 12px;
    font-weight: 500;
  }
  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin-top: 40px;
  }
  .stat-box {
    background: rgba(15, 60, 46, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 24px 28px;
    border-radius: 18px;
    backdrop-filter: blur(10px);
  }
  .stat-box.highlight {
    background: rgba(201, 162, 78, 0.15);
    border-color: #c9a24e;
  }
  .stat-num {
    font-size: 32px;
    font-weight: 800;
    color: #f6dc8f;
    margin-bottom: 6px;
  }
  .stat-title {
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
  }
  .stat-desc {
    font-size: 19px;
    color: #cbd5e1;
    margin-top: 4px;
  }
  .portal-link {
    margin-top: 30px;
    font-size: 24px;
    color: #a9d8c2;
    background: rgba(0,0,0,0.3);
    padding: 12px 24px;
    border-radius: 12px;
    display: inline-block;
  }

  /* Split Video Layout (for Real UI Screen showcase) */
  .split-video-layout {
    display: grid;
    grid-template-columns: 0.9fr 1.1fr;
    gap: 40px;
    align-items: center;
  }
  .ui-shot-container {
    background: #0f172a;
    border: 2px solid rgba(255,255,255,0.2);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 16px 40px rgba(0,0,0,0.5);
  }
  .browser-bar {
    background: #1e293b;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 16px;
    color: #94a3b8;
  }
  .browser-dots {
    display: flex;
    gap: 6px;
  }
  .browser-dots i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #64748b;
  }
  .browser-url {
    font-family: monospace;
    font-size: 14px;
    background: #0f172a;
    padding: 4px 14px;
    border-radius: 6px;
    color: #cbd5e1;
  }
  .real-ui-tag {
    background: #059669;
    color: #ffffff;
    font-size: 13px;
    font-weight: 800;
    padding: 3px 10px;
    border-radius: 6px;
    letter-spacing: 0.5px;
  }
  .video-ui-img {
    width: 100%;
    max-height: 520px;
    object-fit: contain;
    display: block;
    background: #ffffff;
  }

  .ui-info-side {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .feature-card {
    background: rgba(15, 60, 46, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    padding: 28px 32px;
  }
  .feature-card h4 {
    margin: 0 0 16px 0;
    font-size: 26px;
    color: #f6dc8f;
  }
  .video-list {
    margin: 0;
    padding-left: 24px;
    font-size: 20px;
    line-height: 1.6;
    color: #f1f5f9;
  }
  .video-list li {
    margin-bottom: 8px;
  }

  .tip-card {
    background: rgba(201, 162, 78, 0.12);
    border: 1px solid #c9a24e;
    padding: 20px 24px;
    border-radius: 16px;
  }
  .tip-card p {
    font-size: 19px;
    line-height: 1.5;
    color: #e2e8f0;
    margin: 0;
  }

  /* Half Card Styles */
  .card-wrap {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 36px;
    align-items: center;
  }
  .half-card {
    background: rgba(15, 60, 46, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 24px;
    padding: 36px 40px;
    min-height: 400px;
  }
  .half-card.success-card {
    border-color: #10b981;
    background: rgba(6, 78, 59, 0.6);
  }
  .doc-icon {
    font-size: 44px;
    margin-bottom: 12px;
  }
  .half-card h3 {
    margin: 0 0 16px 0;
    font-size: 26px;
    color: #ffffff;
  }
  .bullet-list {
    margin: 0;
    padding-left: 24px;
    font-size: 20px;
    line-height: 1.6;
    color: #e2e8f0;
  }
  .bullet-list li {
    margin-bottom: 10px;
  }
  .warning-text {
    color: #fcd34d !important;
    font-weight: 600;
  }

  .pay-boxes {
    display: flex;
    gap: 14px;
    margin: 14px 0;
  }
  .pay-method {
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 18px;
    font-weight: 700;
  }
  .pay-method.bkash { background: #e2136e; color: #ffffff; }
  .pay-method.nagad { background: #f7941d; color: #ffffff; }
  .pay-method.qr { background: #0284c7; color: #ffffff; }

  .badge-status {
    display: inline-block;
    padding: 6px 16px;
    background: #10b981;
    color: #ffffff;
    font-size: 16px;
    font-weight: 800;
    border-radius: 999px;
    margin-top: 10px;
  }

  /* Slide 6 Closing */
  .closing-box {
    text-align: center;
    max-width: 1400px;
    margin: 0 auto;
  }
  .jubilee-badge {
    display: inline-block;
    font-size: 22px;
    font-weight: 700;
    color: #f6dc8f;
    border: 2px solid #c9a24e;
    padding: 6px 24px;
    border-radius: 999px;
    margin-bottom: 20px;
  }
  .closing-title {
    font-size: 60px;
    font-weight: 800;
    color: #ffffff;
  }
  .closing-date {
    font-size: 30px;
    color: #93c5fd;
    margin-top: 10px;
  }
  .support-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin-top: 40px;
    text-align: left;
  }
  .support-item {
    background: rgba(15, 60, 46, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 18px;
    padding: 24px;
  }
  .sup-icon {
    font-size: 32px;
    margin-bottom: 10px;
  }
  .sup-title {
    font-size: 18px;
    color: #94a3b8;
  }
  .sup-val {
    font-size: 20px;
    font-weight: 700;
    color: #f6dc8f;
    margin-top: 4px;
  }

  /* Footer */
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    padding-top: 20px;
    font-size: 19px;
    color: #94a3b8;
  }
  .footer-right {
    color: #f6dc8f;
    font-weight: 600;
  }
</style>
</head>
<body>
  <div class="watermark">
    <div class="wm-50">৫০</div>
    <div class="wm-sub">YEARS</div>
  </div>

  <div class="header">
    <div class="eyebrow">__EYEBROW__</div>
    <div class="title">__TITLE__</div>
    <div class="subtitle">__SUBTITLE__</div>
  </div>

  <div class="main-body">
    __CONTENT__
  </div>

  <div class="footer">
    <div>Sabuj Shikshayatan Alumni Association · Registration Guide</div>
    <div class="footer-right">Video Guide · ssghsalumni.org</div>
  </div>
</body>
</html>
"""

def render_slides():
    print("Rendering video slides with Headless Edge (incorporating REAL UI screenshots)...")
    images = []
    for i, s in enumerate(slides):
        html = (
            html_template.replace("__EYEBROW__", s["eyebrow"])
            .replace("__TITLE__", s["title"])
            .replace("__SUBTITLE__", s["subtitle"])
            .replace("__CONTENT__", s["content"])
        )
        html_file = TEMP_DIR / f"{s['id']}.html"
        img_file = TEMP_DIR / f"{s['id']}.png"
        html_file.write_text(html, encoding="utf-8")
        
        subprocess.run([
            EDGE,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            "--window-size=1920,1080",
            f"--screenshot={img_file.resolve()}",
            html_file.resolve().as_uri()
        ], check=True)
        
        images.append((img_file, s["duration"]))
        print(f"Rendered slide {i+1}/{len(slides)}: {img_file.name}")
        html_file.unlink()
    return images

def compile_video(slide_images):
    print("Compiling MP4 video using ffmpeg...")
    output_mp4 = VIDEOS_DIR / "registration-guide.mp4"
    output_thumb = VIDEOS_DIR / "registration-guide-thumb.jpg"
    
    # Save thumbnail from slide 1
    im = Image.open(slide_images[0][0])
    im.convert("RGB").save(output_thumb, quality=92, optimize=True)
    print(f"Thumbnail saved: {output_thumb.name} ({output_thumb.stat().st_size // 1024} KB)")

    # Create ffmpeg concat file
    concat_file = TEMP_DIR / "input.txt"
    lines = []
    for img_path, duration in slide_images:
        p_str = img_path.resolve().as_posix()
        lines.append(f"file '{p_str}'")
        lines.append(f"duration {duration}")
    lines.append(f"file '{slide_images[-1][0].resolve().as_posix()}'")
    concat_file.write_text("\n".join(lines), encoding="utf-8")

    cmd = [
        FFMPEG,
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file.resolve()),
        "-vsync", "vfr",
        "-pix_fmt", "yuv420p",
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "20",
        "-movflags", "+faststart",
        str(output_mp4.resolve())
    ]
    subprocess.run(cmd, check=True)
    print(f"Video created successfully: {output_mp4.name} ({output_mp4.stat().st_size // 1024} KB)")

    for img_path, _ in slide_images:
        if img_path.exists():
            img_path.unlink()
    if concat_file.exists():
        concat_file.unlink()
    TEMP_DIR.rmdir()

if __name__ == "__main__":
    imgs = render_slides()
    compile_video(imgs)
    print("Done! Video generator completed.")
