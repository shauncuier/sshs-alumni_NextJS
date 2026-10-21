import base64
import io
from pathlib import Path
import qrcode
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "public" / "docs"
DOCS_DIR.mkdir(parents=True, exist_ok=True)
PDF_OUT = DOCS_DIR / "ssghs-registration-guide.pdf"
HTML_TEMP = ROOT / "scripts" / "_guide_print.html"
UI_DIR = ROOT / "public" / "docs" / "ui-screenshots"

def make_qr_data_url(url: str, fill_color="#064e3b") -> str:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color=fill_color, back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"

def get_optimized_image_b64(path: Path, max_w: int = 1200, quality: int = 86) -> str:
    if not path.exists():
        return ""
    im = Image.open(path)
    if im.mode in ("RGBA", "P"):
        im = im.convert("RGB")
    if im.width > max_w:
        ratio = max_w / float(im.width)
        h = int(im.height * ratio)
        im = im.resize((max_w, h), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=quality, optimize=True)
    return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

# The site has no public address yet, so the codes point to the alumni Facebook group,
# where the registration link and the video are posted.
FACEBOOK_GROUP = "https://www.facebook.com/groups/sshsalumniassociation"
FACEBOOK_PAGE = "https://www.facebook.com/ssghschool"
ASSOCIATION_EMAIL = "sabujshikshayatanalumni@gmail.com"
QR_VIDEO = make_qr_data_url(FACEBOOK_GROUP)
QR_CONTACT = make_qr_data_url(FACEBOOK_GROUP)

# Real UI Screenshots
SS_STEP1 = get_optimized_image_b64(UI_DIR / "guide-details.jpg", max_w=720)
SS_STEP2 = get_optimized_image_b64(UI_DIR / "guide-bangla-qr.jpg", max_w=720)
SS_CARD = get_optimized_image_b64(UI_DIR / "guide-done.jpg", max_w=720)

# Logo
logo_path = ROOT / "public" / "logo.png"
if logo_path.exists():
    with open(logo_path, "rb") as f:
        LOGO_DATA_URL = f"data:image/png;base64,{base64.b64encode(f.read()).decode('utf-8')}"
else:
    LOGO_DATA_URL = ""

# Thumbnail
thumb_path = ROOT / "public" / "videos" / "registration-guide-thumb.jpg"
if thumb_path.exists():
    with open(thumb_path, "rb") as f:
        THUMB_DATA_URL = f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode('utf-8')}"
else:
    THUMB_DATA_URL = ""

html_content = f"""<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<title>SSGHS Alumni Association - Registration Guide</title>
<style>
  @page {{
    size: A4 portrait;
    margin: 8mm 10mm 10mm 10mm;
  }}
  * {{
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }}
  body {{
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', 'Nirmala UI', sans-serif;
    color: #1e293b;
    background: #ffffff;
    font-size: 11.5px;
    line-height: 1.45;
  }}
  
  .page {{
    width: 100%;
    height: 278mm;
    page-break-after: always;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-bottom: 1mm;
  }}
  .page:last-child {{
    page-break-after: avoid;
  }}

  /* Header */
  .page-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #065f46;
    padding-bottom: 6px;
    margin-bottom: 10px;
  }}
  .header-left {{
    display: flex;
    align-items: center;
    gap: 10px;
  }}
  .header-logo {{
    width: 44px;
    height: 44px;
    object-fit: contain;
  }}
  .header-text h1 {{
    margin: 0;
    font-size: 15px;
    color: #064e3b;
    font-weight: 800;
  }}
  .header-text p {{
    margin: 1px 0 0 0;
    font-size: 10px;
    color: #047857;
    font-weight: 600;
  }}
  .header-badge {{
    text-align: right;
  }}
  .header-badge .pill {{
    display: inline-block;
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #f59e0b;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 9.5px;
    font-weight: 700;
  }}
  .header-badge .date {{
    font-size: 9.5px;
    color: #64748b;
    margin-top: 1px;
  }}

  /* Footer */
  .page-footer {{
    border-top: 1px solid #cbd5e1;
    padding-top: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 9px;
    color: #64748b;
  }}
  .footer-links a {{
    color: #065f46;
    text-decoration: none;
    font-weight: 700;
  }}

  /* Hero Card */
  .hero-card {{
    background: linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%);
    color: #ffffff;
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 10px;
  }}
  .hero-eyebrow {{
    font-size: 10px;
    font-weight: 700;
    color: #fde68a;
    letter-spacing: 1px;
    text-transform: uppercase;
  }}
  .hero-title {{
    font-size: 20px;
    font-weight: 800;
    margin: 3px 0 1px 0;
    color: #ffffff;
  }}
  .hero-sub {{
    font-size: 11.5px;
    color: #d1fae5;
    font-weight: 500;
  }}
  .hero-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 10px;
  }}
  .hero-stat {{
    background: rgba(255, 255, 255, 0.12);
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }}
  .hero-stat-label {{
    font-size: 8.5px;
    color: #a7f3d0;
  }}
  .hero-stat-val {{
    font-size: 11.5px;
    font-weight: 700;
    color: #ffffff;
    margin-top: 1px;
  }}

  /* Video Feature Box */
  .video-feature-box {{
    background: #f8fafc;
    border: 2px solid #065f46;
    border-radius: 10px;
    padding: 10px 14px;
    margin-bottom: 10px;
    display: grid;
    grid-template-columns: 100px 1fr 90px;
    gap: 12px;
    align-items: center;
  }}
  .video-thumb-wrap {{
    position: relative;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 3px 6px rgba(0,0,0,0.15);
  }}
  .video-thumb {{
    width: 100%;
    height: 65px;
    object-fit: cover;
    display: block;
  }}
  .play-badge {{
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  .play-icon {{
    width: 24px;
    height: 24px;
    background: #dc2626;
    border-radius: 50%;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }}
  .video-desc h3 {{
    margin: 0 0 2px 0;
    font-size: 13px;
    color: #064e3b;
    font-weight: 800;
  }}
  .video-desc p {{
    margin: 0 0 4px 0;
    font-size: 10.5px;
    color: #475569;
    line-height: 1.35;
  }}
  .video-meta {{
    font-size: 9.5px;
    color: #047857;
    font-weight: 700;
    display: flex;
    gap: 10px;
  }}
  .video-qr-wrap {{
    text-align: center;
  }}
  .qr-img {{
    width: 70px;
    height: 70px;
    display: block;
    margin: 0 auto;
    border-radius: 5px;
    border: 1px solid #cbd5e1;
  }}
  .qr-caption {{
    font-size: 8px;
    font-weight: 700;
    color: #065f46;
    margin-top: 2px;
    line-height: 1.15;
  }}

  /* Step Headers */
  .step-header {{
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f1f5f9;
    border-left: 4px solid #065f46;
    padding: 5px 10px;
    border-radius: 0 6px 6px 0;
    margin-bottom: 8px;
  }}
  .step-badge {{
    background: #065f46;
    color: #ffffff;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
  }}
  .step-title {{
    font-size: 12.5px;
    font-weight: 700;
    color: #0f172a;
  }}
  .step-title-bn {{
    font-size: 11px;
    color: #475569;
    font-weight: 500;
  }}

  /* Real UI Screenshot Frame */
  .ui-mockup-frame {{
    background: #ffffff;
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 3px 8px rgba(0,0,0,0.08);
  }}
  .ui-mockup-bar {{
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 9px;
    color: #64748b;
    font-weight: 600;
  }}
  .ui-dots {{
    display: flex;
    gap: 3px;
  }}
  .ui-dot {{
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #cbd5e1;
  }}
  .ui-mockup-img {{
    width: 100%;
    display: block;
    max-height: 175mm;
    object-fit: cover;
    object-position: top center;
  }}
  .ui-badge-tag {{
    display: inline-block;
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 8.5px;
    font-weight: 700;
  }}

  /* 2 Column UI + Details Layout */
  .ui-details-split {{
    display: grid;
    grid-template-columns: 0.9fr 1.1fr;
    gap: 12px;
    align-items: start;
    margin-bottom: 8px;
  }}

  .info-box {{
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    padding: 8px 10px;
  }}
  .info-box h4 {{
    margin: 0 0 4px 0;
    font-size: 11.5px;
    color: #064e3b;
    font-weight: 700;
  }}
  .info-box p, .info-box ul {{
    margin: 0;
    font-size: 10.5px;
    color: #334155;
    line-height: 1.4;
  }}
  .info-box ul {{
    padding-left: 14px;
  }}
  .info-box li {{
    margin-bottom: 3px;
  }}

  /* Tables */
  .guide-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
    margin-top: 4px;
  }}
  .guide-table th {{
    background: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
    text-align: left;
    padding: 4px 6px;
    border: 1px solid #cbd5e1;
  }}
  .guide-table td {{
    padding: 4px 6px;
    border: 1px solid #e2e8f0;
    color: #334155;
  }}

  .alert-box {{
    border-radius: 6px;
    padding: 6px 10px;
    margin-bottom: 8px;
    font-size: 10px;
    line-height: 1.35;
  }}
  .alert-warning {{
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
  }}
  .alert-info {{
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    color: #065f46;
  }}

  .pay-pill {{
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 800;
    font-size: 9.5px;
    color: white;
  }}
  .pay-bkash {{ background: #e2136e; }}
  .pay-nagad {{ background: #f7941d; }}
</style>
</head>
<body>

  <!-- ==================== PAGE 1: OVERVIEW & VIDEO TUTORIAL ==================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="header-left">
          {f'<img src="{LOGO_DATA_URL}" class="header-logo" alt="Logo">' if LOGO_DATA_URL else ''}
          <div class="header-text">
            <h1>সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয় প্রাক্তন ছাত্র-ছাত্রী পরিষদ</h1>
            <p>Sabuj Shikshayatan Govt. High School Alumni Association · Established 1976</p>
          </div>
        </div>
        <div class="header-badge">
          <span class="pill">OFFICIAL MANUAL · ইউজার গাইড</span>
          <div class="date">Golden Jubilee 2026 · সুবর্ণ জয়ন্তী</div>
        </div>
      </div>

      <div class="hero-card">
        <div class="hero-eyebrow">STEP-BY-STEP USER REGISTRATION MANUAL · নিবন্ধন নির্দেশিকা</div>
        <div class="hero-title">Golden Jubilee 2026 & Lifetime Membership</div>
        <div class="hero-sub">বিদ্যালয়ের সুবর্ণ জয়ন্তী উৎসব উদযাপন ও আজীবন পরিষদ সদস্যপদ গ্রহণের সচিত্র গাইড</div>
        <div class="hero-grid">
          <div class="hero-stat">
            <div class="hero-stat-label">ইভেন্টের তারিখ / Date</div>
            <div class="hero-stat-val">আনুমানিক ২৬ ডিসেম্বর ২০২৬ (চূড়ান্ত নয়)</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-label">স্থান / Venue</div>
            <div class="hero-stat-val">বিদ্যালয় প্রাঙ্গণ, সীতাকুণ্ড</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-label">রেজিস্ট্রেশন ফি / Fee</div>
            <div class="hero-stat-val">৳১,৫০০ / ৳১,২৫০ (ব্যাচ অনুযায়ী)</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-label">শেষ সময় / Deadline</div>
            <div class="hero-stat-val">৩০ নভেম্বর ২০২৬</div>
          </div>
        </div>
      </div>

      <!-- Video Callout Box with QR Code -->
      <div class="video-feature-box">
        <div class="video-thumb-wrap">
          {f'<img src="{THUMB_DATA_URL}" class="video-thumb" alt="Video">' if THUMB_DATA_URL else '<div style="background:#064e3b;height:65px;"></div>'}
          <div class="play-badge"><div class="play-icon">▶</div></div>
        </div>
        <div class="video-desc">
          <span style="background:#fee2e2;color:#991b1b;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;">VIDEO TUTORIAL · ভিডিও টিউটোরিয়াল</span>
          <h3 style="margin-top:2px;">ভিডিও নির্দেশিকা দেখে সহজেই রেজিস্ট্রেশন সম্পন্ন করুন</h3>
          <p>মোবাইল ফোনে কীভাবে ফর্ম পূরণ করবেন, ছবি ও সনদ দেবেন, SMS কোড দিয়ে নম্বর যাচাই করবেন এবং বাংলা QR স্ক্যান করে ফি দেবেন তা ভিডিওতে ধাপে ধাপে দেখানো হয়েছে।</p>
          <div class="video-meta">
            <span>⏱️ সময়কাল: ১ মিনিট ১৩ সেকেন্ড</span>
            <span>🌐 ভিডিও ও রেজিস্ট্রেশন লিংক: <strong>অ্যালামনাই ফেসবুক গ্রুপে</strong></span>
          </div>
        </div>
        <div class="video-qr-wrap">
          <img src="{QR_VIDEO}" class="qr-img" alt="QR Code">
          <div class="qr-caption">স্ক্যান করে ফেসবুক গ্রুপে যান</div>
        </div>
      </div>

      <div class="step-header">
        <span class="step-badge">OVERVIEW</span>
        <span class="step-title">নিবন্ধনের মূল প্রবাহ ও করণীয় ধাপসমূহ (4 Simple Steps)</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div class="info-box">
          <h4>📌 সদস্য হিসেবে আপনার সুবিধাসমূহ:</h4>
          <ul>
            <li><strong>উৎসব কিট:</strong> সুবর্ণ জয়ন্তী টি-শার্ট, স্মরণিকা, ব্যাজ ও স্মারক উপহার।</li>
            <li><strong>দিনব্যাপী খাবার:</strong> সকালের নাস্তা, দুপুরের খাবার এবং বিরিয়ানি ডিনার।</li>
            <li><strong>সদস্যপদ:</strong> পরিষদের সদস্যপদ ও কিউআর কোডসহ ডিজিটাল সদস্য কার্ড।</li>
            <li><strong>পুনর্মিলনী:</strong> ১৯৭৭ থেকে ২০২৬ সাল পর্যন্ত সকল ব্যাচের বন্ধুদের সাথে মহামিলন।</li>
          </ul>
        </div>
        <div class="info-box">
          <h4>📋 রেজিস্ট্রেশন শুরুর আগে প্রস্তুত রাখুন:</h4>
          <ul>
            <li><strong>১. পাসপোর্ট সাইজের ছবি:</strong> স্পষ্ট ছবি (ন্যূনতম ৬০০ × ৬০০ পিক্সেল, সর্বোচ্চ ৫ MB)।</li>
            <li><strong>২. প্রমাণপত্র:</strong> এসএসসি সনদ, প্রশংসাপত্র অথবা মার্কশিট (PDF বা ছবি)।</li>
            <li><strong>৩. পেমেন্ট:</strong> বাংলা QR স্ক্যানের জন্য যেকোনো ব্যাংক বা মোবাইল ব্যাংকিং অ্যাপ (বিকাশ, নগদ, রকেট…), অথবা নগদ টাকা।</li>
            <li><strong>৪. সচল মোবাইল নম্বর:</strong> SMS-এ আসা ৪ সংখ্যার কোড দিয়ে নম্বর যাচাই করতে হবে।</li>
          </ul>
        </div>
      </div>

      <div class="alert-box alert-info">
        <strong>💡 রেজিস্ট্রেশন লিংক:</strong> স্কুলের ফেসবুক পেজ ও অ্যালামনাই ফেসবুক গ্রুপের পোস্টে দেওয়া আছে। ফি: ১৯৮৯–২০১৪ ব্যাচ ৳১,৫০০, ২০১৫–২০২৬ ব্যাচ ৳১,২৫০; স্বামী/স্ত্রী ও ৫+ বছরের সন্তান প্রতিজন ৳৬০০।
      </div>
    </div>

    <div class="page-footer">
      <div>Sabuj Shikshayatan Alumni Association · Official Registration Manual 2026</div>
      <div class="footer-links">Facebook group: <a href="{FACEBOOK_GROUP}">facebook.com/groups/sshsalumniassociation</a></div>
      <div>Page 1 of 4</div>
    </div>
  </div>

  <!-- ==================== PAGE 2: REAL UI SCREENSHOT STEP 1 & STEP 2 ==================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="header-left">
          {f'<img src="{LOGO_DATA_URL}" class="header-logo" alt="Logo">' if LOGO_DATA_URL else ''}
          <div class="header-text">
            <h1>ধাপ ১ ও ২: ব্যক্তিগত তথ্য ও প্রামাণ্য নথি (Real UI Screen)</h1>
            <p>Step 1 & 2: Real Portal Account Form & Document Upload</p>
          </div>
        </div>
        <div class="header-badge">
          <span class="pill">REAL UI SCREENSHOT</span>
          <div class="date">Step 1 & 2</div>
        </div>
      </div>

      <!-- Step 1 & 2 Header -->
      <div class="step-header">
        <span class="step-badge">STEP 1 & 2</span>
        <span class="step-title">ওয়েবসাইটের মূল রেজিস্ট্রেশন ফর্ম ও ফিল্ড পূরণ পদ্ধতি</span>
      </div>

      <!-- Split Layout: Real UI Screenshot on Left, Explanations on Right -->
      <div class="ui-details-split">
        <!-- Left: Real UI Screenshot -->
        <div>
          <div class="ui-mockup-frame">
            <div class="ui-mockup-bar">
              <div class="ui-dots">
                <div class="ui-dot" style="background:#ef4444;"></div>
                <div class="ui-dot" style="background:#f59e0b;"></div>
                <div class="ui-dot" style="background:#10b981;"></div>
              </div>
              <span class="ui-badge-tag">রেজিস্ট্রেশন ফর্মের মূল স্ক্রিনশট</span>
              <span style="font-size:8px;">নমুনা তথ্য · sample data</span>
            </div>
            {f'<img src="{SS_STEP1}" class="ui-mockup-img" alt="Step 1 UI">' if SS_STEP1 else '<div style="height:380px;background:#f1f5f9;"></div>'}
          </div>
          <div style="font-size:8.5px;color:#64748b;text-align:center;margin-top:3px;">
            ▲ পোর্টালে সরাসরি তথ্য পূরণরত অবস্থার বাস্তব দৃশ্য
          </div>
        </div>

        <!-- Right: Field by Field Instructions -->
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div class="info-box">
            <h4>📝 ফর্মের তথ্য পূরণের নির্দেশিকা:</h4>
            <table class="guide-table">
              <thead>
                <tr><th>ফিল্ড (Field)</th><th>নির্দেশনা</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Full Name</strong></td>
                  <td>সার্টিফিকেট অনুযায়ী আপনার ইংরেজি নাম লিখুন।</td>
                </tr>
                <tr>
                  <td><strong>SSC Batch</strong></td>
                  <td><strong>১৯৭৭ থেকে ২০২৬</strong> এর মধ্যে আপনার এসএসসি ব্যাচ ড্রপডাউন থেকে নির্বাচন করুন।</td>
                </tr>
                <tr>
                  <td><strong>Roll & Group</strong></td>
                  <td>আপনার তৎকালীন রোল ও বিভাগ (বিজ্ঞান / ব্যবসায় শিক্ষা / মানবিক) — ঐচ্ছিক।</td>
                </tr>
                <tr>
                  <td><strong>Blood Group</strong></td>
                  <td>রক্তের গ্রুপ (A+, B+, O+, AB+ ইত্যাদি) — ঐচ্ছিক।</td>
                </tr>
                <tr>
                  <td><strong>Mobile</strong></td>
                  <td>নম্বর লিখে Send code চাপুন, SMS-এ আসা ৪ সংখ্যার কোড দিন। একটি নম্বরে একটিই রেজিস্ট্রেশন।</td>
                </tr>
                <tr>
                  <td><strong>Email</strong></td>
                  <td>লগইন ও নিশ্চিতকরণ বার্তার জন্য আপনার ইমেইল।</td>
                </tr>
                <tr>
                  <td><strong>Password</strong></td>
                  <td>ন্যূনতম ৮ অক্ষরের পাসওয়ার্ড দিন।</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="info-box">
            <h4>📷 ছবি ও সনদপত্র নির্দেশিকা:</h4>
            <ul>
              <li><strong>প্রোফাইল ছবি:</strong> ন্যূনতম <strong>৬০০ × ৬০০ পিক্সেল</strong> পাসপোর্ট সাইজ স্পষ্ট ছবি (সর্বোচ্চ ৫ MB)। এটি আপনার ডিজিটাল আইডি কার্ডে বসবে।</li>
              <li><strong>প্রামাণ্য নথি (Proof Document):</strong>
                <br>• এসএসসি সনদ (Certificate)
                <br>• প্রশংসাপত্র (Testimonial)
                <br>• এসএসসি মার্কশিট (Marksheet)
              </li>
            </ul>
          </div>

          <div class="alert-box alert-warning">
            <strong>⚠️ iPhone ও Android HEIC ছবি সতর্কতা:</strong>
            <br>ফোনের ক্যামেরা অনেক সময় <code>.heic</code> ফরম্যাটে ছবি তোলে। সার্ভারে দিতে ছবির একটি <strong>স্ক্রিনশট (Screenshot)</strong> নিন অথবা ফর্মে স্ক্রিনশটটি আপলোড করুন।
          </div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <div>Sabuj Shikshayatan Alumni Association · Official Registration Manual 2026</div>
      <div class="footer-links">Email: <a href="mailto:{ASSOCIATION_EMAIL}">{ASSOCIATION_EMAIL}</a></div>
      <div>Page 2 of 4</div>
    </div>
  </div>

  <!-- ==================== PAGE 3: REAL UI SCREENSHOT STEP 3 & STEP 4 ==================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="header-left">
          {f'<img src="{LOGO_DATA_URL}" class="header-logo" alt="Logo">' if LOGO_DATA_URL else ''}
          <div class="header-text">
            <h1>ধাপ ৩: পরিবার, টি-শার্ট ও বাংলা QR পেমেন্ট (Real UI Screen)</h1>
            <p>Step 3: Family members, T-shirt size & Bangla QR payment</p>
          </div>
        </div>
        <div class="header-badge">
          <span class="pill">PAYMENT UI SCREEN</span>
          <div class="date">Step 3</div>
        </div>
      </div>

      <!-- Step 3 & 4 Header -->
      <div class="step-header">
        <span class="step-badge">STEP 3</span>
        <span class="step-title">টি-শার্ট সাইজ, পরিবারের সদস্য এবং বাংলা QR বা নগদ টাকায় ফি পরিশোধ</span>
      </div>

      <!-- Split Layout: Left Details, Right Real UI Screenshot -->
      <div class="ui-details-split">
        <!-- Left: Sizing, Payment instructions -->
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div class="info-box">
            <h4>👕 টি-শার্ট ও পরিবারের সদস্য:</h4>
            <ul>
              <li>টি-শার্টের সাইজ বাছাই করুন: <strong>S, M, L, XL বা XXL</strong>।</li>
              <li>স্বামী/স্ত্রী সাথে এলে: <strong>৳৬০০</strong>।</li>
              <li>৫ বছর বা তার বেশি বয়সী সন্তান: প্রতিজন <strong>৳৬০০</strong>; ৫ বছরের কম বয়সীরা বিনামূল্যে।</li>
              <li>মোট টাকা ফর্মে নিজে থেকেই হিসাব হয়।</li>
            </ul>
          </div>

          <div class="info-box">
            <h4>💳 পেমেন্ট: বাংলা QR অথবা নগদ টাকা</h4>
            <div style="display:flex;gap:6px;margin:4px 0 6px 0;">
              <span style="background:#0284c7;color:white;padding:2px 6px;border-radius:4px;font-size:9.5px;font-weight:700;">Bangla QR</span>
              <span style="background:#065f46;color:white;padding:2px 6px;border-radius:4px;font-size:9.5px;font-weight:700;">Cash নগদ টাকা</span>
            </div>
            <ul>
              <li><strong>১.</strong> ফর্মে <strong>Bangla QR</strong> বেছে নিন। QR কোডটি যেকোনো ব্যাংক বা মোবাইল ব্যাংকিং অ্যাপ (বিকাশ, নগদ, রকেট, উপায়…) দিয়ে স্ক্যান করে মোট টাকা দিন।</li>
              <li><strong>২.</strong> পেমেন্টের রসিদ থেকে <strong>Transaction ID (TrxID)</strong> ফর্মে লিখুন। চাইলে রসিদের স্ক্রিনশটও দিন।</li>
              <li><strong>৩.</strong> শেষে <strong>Register</strong> বাটনে চাপুন।</li>
            </ul>
          </div>

          <div class="info-box" style="border-left: 3px solid #059669; background:#f0fdf4;">
            <h4 style="color:#065f46;">💵 নগদ টাকায় দিতে চাইলে:</h4>
            <p style="font-size:10px; color:#166534;">
              ফর্মে <strong>Cash</strong> বেছে নিন, কমিটির সদস্যকে টাকা দিয়ে রসিদ নিন এবং রসিদ নম্বরটি ফর্মে লিখুন। স্মার্টফোন না থাকলে কমিটির কাছে কাগজের ফর্মেও রেজিস্ট্রেশন করা যায়।
            </p>
          </div>
        </div>

        <!-- Right: Real UI Screenshot of Step 2 Payment -->
        <div>
          <div class="ui-mockup-frame">
            <div class="ui-mockup-bar">
              <div class="ui-dots">
                <div class="ui-dot" style="background:#ef4444;"></div>
                <div class="ui-dot" style="background:#f59e0b;"></div>
                <div class="ui-dot" style="background:#10b981;"></div>
              </div>
              <span class="ui-badge-tag">বাংলা QR ও TrxID স্ক্রিন</span>
              <span style="font-size:8px;">Live Checkout UI</span>
            </div>
            {f'<img src="{SS_STEP2}" class="ui-mockup-img" alt="Step 2 UI">' if SS_STEP2 else '<div style="height:380px;background:#f1f5f9;"></div>'}
          </div>
          <div style="font-size:8.5px;color:#64748b;text-align:center;margin-top:3px;">
            ▲ মোট টাকা, বাংলা QR কোড ও TrxID লেখার অংশ
          </div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <div>Sabuj Shikshayatan Alumni Association · Official Registration Manual 2026</div>
      <div class="footer-links">Facebook page: <a href="{FACEBOOK_PAGE}">facebook.com/ssghschool</a></div>
      <div>Page 3 of 4</div>
    </div>
  </div>

  <!-- ==================== PAGE 4: REAL UI DIGITAL CARD & FAQ ==================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div class="header-left">
          {f'<img src="{LOGO_DATA_URL}" class="header-logo" alt="Logo">' if LOGO_DATA_URL else ''}
          <div class="header-text">
            <h1>ধাপ ৪: নিশ্চিতকরণ, টিকিট ও সদস্য কার্ড (FAQ)</h1>
            <p>Step 4: Confirmation, entry ticket, member card & FAQs</p>
          </div>
        </div>
        <div class="header-badge">
          <span class="pill">CONFIRMATION</span>
          <div class="date">Final Step</div>
        </div>
      </div>

      <!-- Real Card Showcase Frame -->
      <div class="step-header">
        <span class="step-badge">STEP 4</span>
        <span class="step-title">জমা দেওয়ার পর: কমিটি যাচাই করে নিশ্চিত করলে এসএমএস ও ইমেইল, তারপর ড্যাশবোর্ডে টিকিট ও কার্ড</span>
      </div>

      <div style="margin-bottom:10px;">
        <div class="ui-mockup-frame">
          <div class="ui-mockup-bar">
            <div class="ui-dots">
              <div class="ui-dot" style="background:#ef4444;"></div>
              <div class="ui-dot" style="background:#f59e0b;"></div>
              <div class="ui-dot" style="background:#10b981;"></div>
            </div>
            <span class="ui-badge-tag" style="background:#dbeafe;color:#1e40af;border-color:#93c5fd;">রেজিস্ট্রেশন জমা হওয়ার বার্তা</span>
            <span style="font-size:8px;">নমুনা · sample</span>
          </div>
          {f'<img src="{SS_CARD}" class="ui-mockup-img" style="max-height:70mm;object-fit:contain;" alt="Registration submitted">' if SS_CARD else '<div style="height:150px;background:#f1f5f9;"></div>'}
        </div>
        <div style="font-size:8.5px;color:#64748b;text-align:center;margin-top:2px;">
          ▲ জমা দেওয়ার পর এই বার্তা দেখবেন; নিশ্চিত হলে লগইন করে ড্যাশবোর্ড থেকে টিকিট, পেমেন্ট স্লিপ ও সদস্য কার্ড পাবেন
        </div>
      </div>

      <!-- FAQ Section -->
      <div class="step-header">
        <span class="step-badge">FAQ</span>
        <span class="step-title">সচরাচর জিজ্ঞাসিত প্রশ্নাবলি (Frequently Asked Questions)</span>
      </div>

      <div class="info-box" style="margin-bottom:8px;">
        <div style="margin-bottom:6px;">
          <strong style="color:#064e3b;font-size:11px;">প্র: আবেদন জমা দেওয়ার কতক্ষণের মধ্যে মেম্বারশিপ ও টিকিট অনুমোদিত হয়?</strong>
          <p style="margin-top:1px;font-size:10px;">উ: কমিটি আপনার পেমেন্ট ও প্রমাণপত্র যাচাই করে নিশ্চিত করে। নিশ্চিত হলেই মোবাইলে এসএমএস ও ইমেইলে বার্তা যায়।</p>
        </div>
        <div style="margin-bottom:6px;">
          <strong style="color:#064e3b;font-size:11px;">প্র: এসএসসি সনদ হারিয়ে গেলে কী দেব?</strong>
          <p style="margin-top:1px;font-size:10px;">উ: বিদ্যালয়ের প্রশংসাপত্র (Testimonial) অথবা এসএসসি মার্কশিট দিতে পারবেন।</p>
        </div>
        <div>
          <strong style="color:#064e3b;font-size:11px;">প্র: ভুলবশত ভুল TrxID লিখে সাবমিট করে ফেললে করণীয় কী?</strong>
          <p style="margin-top:1px;font-size:10px;">উ: রসিদের স্ক্রিনশট দিয়ে থাকলে কমিটি তা দেখে মিলিয়ে নেবে। না হলে সঠিক TrxID ও আপনার মোবাইল নম্বর লিখে <strong>{ASSOCIATION_EMAIL}</strong>-এ ইমেইল করুন।</p>
        </div>
      </div>

      <!-- Support & Contact Card with QR -->
      <div style="background:#f8fafc;border:1.5px solid #065f46;border-radius:8px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;">
        <div style="max-width:440px;">
          <h4 style="margin:0 0 2px 0;font-size:12px;color:#064e3b;">📞 যেকোনো সমস্যায় সরাসরি যোগাযোগ ও সহায়তা:</h4>
          <p style="margin:0;font-size:10px;color:#475569;line-height:1.35;">
            অনলাইন ফর্ম পূরণে কোনো সমস্যা হলে ইমেইল করুন অথবা অ্যালামনাই ফেসবুক গ্রুপে জানান।
            <br>• <strong>ইমেইল:</strong> {ASSOCIATION_EMAIL}
            <br>• <strong>ফেসবুক গ্রুপ:</strong> facebook.com/groups/sshsalumniassociation
          </p>
        </div>
        <div style="text-align:center;">
          <img src="{QR_CONTACT}" style="width:60px;height:60px;display:block;margin:0 auto;border-radius:4px;border:1px solid #cbd5e1;" alt="QR">
          <div style="font-size:7.5px;font-weight:700;color:#064e3b;margin-top:1px;">ফেসবুক গ্রুপ</div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <div>Sabuj Shikshayatan Alumni Association · Official Registration Manual 2026</div>
      <div class="footer-links">Email: <a href="mailto:{ASSOCIATION_EMAIL}">{ASSOCIATION_EMAIL}</a></div>
      <div>Page 4 of 4</div>
    </div>
  </div>

</body>
</html>
"""

def generate_pdf():
    from playwright.sync_api import sync_playwright

    print("Writing print HTML with the real UI screenshots...")
    HTML_TEMP.write_text(html_content, encoding="utf-8")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto(HTML_TEMP.resolve().as_uri(), wait_until="networkidle")
            page.pdf(path=str(PDF_OUT), prefer_css_page_size=True, print_background=True)
            browser.close()
    finally:
        HTML_TEMP.unlink(missing_ok=True)
    print(f"PDF generated successfully: {PDF_OUT.name} ({PDF_OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    generate_pdf()
