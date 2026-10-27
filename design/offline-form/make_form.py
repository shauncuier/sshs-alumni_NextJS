"""
Golden Jubilee 2026 offline (paper) registration form: one Legal page (8.5 x 14 in),
Bangla + English, with an office-use box and a tear-off money receipt at the bottom.

Run:  python design/offline-form/make_form.py
Out:  design/offline-form/golden-jubilee-offline-registration-form.pdf

Rendered with Microsoft Edge (headless print-to-pdf) so Bangla text is shaped
correctly. Fees, deadline and payment numbers are set below: change them here when
the committee changes them in Admin, then run the script again.
"""
from __future__ import annotations

import base64
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = HERE / "golden-jubilee-offline-registration-form.pdf"

# ---- Event facts (keep in step with Admin -> Events and Admin -> Payment settings)
FEES = [
    ("এসএসসি ব্যাচ ১৯৮৯–২০১৪", "SSC batch 1989–2014", "১,৫০০"),
    ("এসএসসি ব্যাচ ২০১৫–২০২৬", "SSC batch 2015–2026", "১,২৫০"),
]
SPOUSE_FEE = "৬০০"
CHILD_FEE = "৬০০"
DEADLINE = "৩০ নভেম্বর ২০২৬"
EVENT_DATE = "আনুমানিক ২৬ ডিসেম্বর ২০২৬"
VENUE = "বিদ্যালয় প্রাঙ্গণ, সীতাকুণ্ড, চট্টগ্রাম"
# Bangla QR: put the association's QR image here (PNG/JPG) and it is printed on the
# form; without it the form says to scan the QR at the registration desk.
BANGLA_QR = next((HERE / f"bangla-qr.{ext}" for ext in ("png", "jpg", "jpeg") if (HERE / f"bangla-qr.{ext}").exists()), HERE / "bangla-qr.png")
QR_MERCHANT = "PRAKTAN CHATRO CHATRI PORISHAD SABUJ SHIKSHAYATAN"
QR_BANK = "ONE Bank · OK Wallet"
QR_ACCOUNT = "01819172910"
EMAIL = "info@exsabujian.org"
SITE = "/jubilee"

GREEN = "#06281e"
GOLD = "#b8892a"


def data_uri(path: Path, mime: str) -> str:
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def logo_uri() -> str:
    """The association's logo cropped close (public/logo.png has margin for the site's round frames)."""
    import io
    from PIL import Image, ImageChops
    src = Image.open(ROOT / "design" / "brand" / "alumni-council-logo.jpg").convert("RGB")
    ink = ImageChops.difference(src, Image.new("RGB", src.size, (255, 255, 255))).convert("L")
    art = src.crop(ink.point(lambda v: 255 if v > 18 else 0).getbbox())
    art.thumbnail((480, 480), Image.LANCZOS)
    buf = io.BytesIO()
    art.save(buf, format="JPEG", quality=88)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


LOGO = logo_uri()
QR = data_uri(BANGLA_QR, "image/jpeg" if BANGLA_QR.suffix.lower() in (".jpg", ".jpeg") else "image/png") if BANGLA_QR.exists() else None
QR_BOX = (
    f'<img src="{QR}" alt="Bangla QR">'
    if QR
    else '<span>বাংলা QR<br>ডেস্কে স্ক্যান করুন<br><span class="en">scan at the desk</span></span>'
)


def boxes(n: int, cls: str = "box") -> str:
    return "".join(f'<span class="{cls}"></span>' for _ in range(n))


def check(label: str) -> str:
    return f'<span class="chk"><span class="tick"></span>{label}</span>'


def line(bn: str, en: str, extra: str = "") -> str:
    return f'<div class="field {extra}"><div class="lbl"><span class="bn">{bn}</span> <span class="en">{en}</span></div><div class="write"></div></div>'


fee_rows = "".join(
    f"<tr><td>{check('')}</td><td><span class='bn'>{bn}</span> <span class='en'>{en}</span></td><td class='c'>১</td><td class='r'>৳{amt}</td><td class='amt'></td></tr>"
    for bn, en, amt in FEES
)

HTML = f"""<!doctype html><html lang="bn"><head><meta charset="utf-8">
<style>
@page {{ size: legal; margin: 9mm 11mm; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; font-family: 'Nirmala UI', 'Shonar Bangla', 'Segoe UI', sans-serif; color: #1c2b25; font-size: 9.6pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
.bn {{ font-family: 'Nirmala UI', 'Shonar Bangla', sans-serif; }}
.en {{ color: #5b6b64; font-size: 8pt; }}
.page {{ page-break-after: always; }}
.page:last-child {{ page-break-after: auto; }}

.head {{ display: flex; align-items: center; gap: 4mm; border-bottom: 1mm solid {GREEN}; padding-bottom: 2.5mm; }}
.head img {{ width: 18mm; height: 18mm; object-fit: contain; }}
.head .t1 {{ font-size: 11.5pt; white-space: nowrap; font-weight: 700; color: {GREEN}; line-height: 1.2; }}
.head .t2 {{ font-size: 9pt; color: #374740; }}
.head .t3 {{ font-size: 8pt; color: #5b6b64; }}
.formno {{ margin-left: auto; text-align: right; font-size: 7.5pt; color: #374740; flex-shrink: 0; }}
.formno .b {{ display: inline-block; width: 26mm; height: 6.5mm; border: 0.3mm solid #8a9a93; margin-top: 1mm; }}

.titlebar {{ margin-top: 2.5mm; background: {GREEN}; color: #fff; border-radius: 1.5mm; padding: 2mm 4mm; display: flex; justify-content: space-between; align-items: baseline; }}
.titlebar .a {{ font-size: 13pt; font-weight: 700; }}
.titlebar .a .gold {{ color: #f1cf72; }}
.titlebar .b {{ font-size: 8.5pt; color: #d5e6de; }}
.facts {{ margin-top: 1.5mm; font-size: 8.5pt; color: #374740; display: flex; gap: 6mm; flex-wrap: wrap; }}
.facts b {{ color: {GREEN}; }}

h2 {{ margin: 1.5mm 0 0.8mm; font-size: 10.5pt; color: {GREEN}; border-bottom: 0.3mm solid #c9d6d0; padding-bottom: 0.8mm; display: flex; gap: 2mm; align-items: baseline; }}
h2 .n {{ display: inline-flex; width: 5mm; height: 5mm; border-radius: 50%; background: {GREEN}; color: #fff; font-size: 8pt; align-items: center; justify-content: center; }}
h2 .en {{ font-weight: 400; }}

.grid {{ display: grid; grid-template-columns: 1fr 1fr; column-gap: 5mm; }}
.field {{ margin-bottom: 1.1mm; }}
.field .lbl {{ font-size: 8.8pt; }}
.field .write {{ height: 4.6mm; border-bottom: 0.3mm dotted #6f8079; }}
.span2 {{ grid-column: span 2; }}

.top {{ display: grid; grid-template-columns: 1fr 30mm; gap: 5mm; align-items: start; }}
.photo {{ border: 0.35mm dashed #6f8079; height: 34mm; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7.5pt; color: #5b6b64; padding: 2mm; }}

.row {{ display: flex; align-items: center; gap: 2mm; flex-wrap: wrap; margin-bottom: 1.6mm; font-size: 8.8pt; }}
.box {{ display: inline-block; width: 5.2mm; height: 6.2mm; border: 0.3mm solid #6f8079; margin-right: -0.3mm; background: #fff; }}
.tight .chk {{ margin-right: 1.6mm; }}
.chk {{ display: inline-flex; align-items: center; gap: 1.2mm; margin-right: 3.5mm; white-space: nowrap; }}
.tick {{ display: inline-block; width: 3.6mm; height: 3.6mm; border: 0.3mm solid #4b5b54; border-radius: 0.6mm; }}

table.fee {{ width: 100%; border-collapse: collapse; font-size: 8.8pt; }}
table.fee th {{ background: #e8f1ed; color: {GREEN}; font-weight: 700; text-align: left; padding: 1.2mm 2mm; border: 0.3mm solid #b9c9c2; }}
table.fee td {{ padding: 0.7mm 2mm; border: 0.3mm solid #b9c9c2; vertical-align: middle; }}
table.fee .c {{ text-align: center; width: 18mm; }}
table.fee .r {{ text-align: right; width: 22mm; }}
table.fee .amt {{ width: 28mm; }}
table.fee td:first-child {{ width: 8mm; text-align: center; }}
table.fee .total td {{ font-weight: 700; background: #f6f2e4; }}
.blank {{ display: inline-block; min-width: 10mm; border-bottom: 0.3mm dotted #6f8079; }}

.pay {{ display: grid; grid-template-columns: 1fr 1.6fr; gap: 3mm; margin-bottom: 1.6mm; }}
.qrcard {{ display: flex; gap: 3mm; align-items: center; }}
.qr {{ width: 26mm; height: 26mm; flex-shrink: 0; border: 0.3mm solid #b9c9c2; border-radius: 1mm; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 6.8pt; color: #5b6b64; }}
.qr img {{ width: 100%; height: 100%; object-fit: contain; }}
.paycard {{ border: 0.3mm solid #b9c9c2; border-radius: 1.5mm; padding: 1.8mm 2.5mm; font-size: 8.4pt; }}
.paycard b {{ color: {GREEN}; font-size: 9.5pt; }}

.declare {{ margin-top: 2mm; padding: 2mm 3mm; background: #f4f7f5; border-radius: 1.5mm; font-size: 8.4pt; line-height: 1.45; }}
.sign {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; margin-top: 4mm; font-size: 8.4pt; }}
.sign div {{ border-top: 0.3mm solid #4b5b54; padding-top: 1mm; }}

.foot {{ margin-top: 3mm; font-size: 7.6pt; color: #5b6b64; text-align: center; }}

/* page 2 */
.office {{ border: 0.5mm solid {GREEN}; border-radius: 2mm; padding: 1.5mm 3.5mm 0.5mm; margin-top: 2mm; }}
.howto {{ margin-top: 2mm; font-size: 8.2pt; line-height: 1.45; color: #374740; }}
.howto b {{ color: {GREEN}; }}
.grid4 {{ display: grid; grid-template-columns: repeat(4, 1fr); column-gap: 4mm; }}
.grid3 {{ display: grid; grid-template-columns: 1fr 1fr 1fr; column-gap: 4mm; }}
.field.inline {{ display: inline-block; width: 45mm; margin: 0 3mm 0 0; }}
.office .h {{ font-weight: 700; color: {GREEN}; font-size: 9.5pt; margin-bottom: 1mm; }}
.cut {{ margin: 3mm 0 3mm; border-top: 0.4mm dashed #6f8079; position: relative; }}
.cut span {{ position: absolute; top: -2.6mm; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 2mm; font-size: 8pt; color: #5b6b64; }}
.receipt {{ border: 0.5mm solid {GOLD}; border-radius: 2mm; padding: 2mm 3.5mm; break-inside: avoid; }}
.receipt .h {{ display: flex; align-items: center; gap: 3mm; border-bottom: 0.3mm solid #e2d3a8; padding-bottom: 1.5mm; margin-bottom: 1.5mm; }}
.receipt .h img {{ width: 11mm; height: 11mm; object-fit: contain; }}
.receipt .h .t {{ font-weight: 700; color: {GREEN}; font-size: 11pt; }}
.steps {{ margin: 0; padding-left: 5mm; font-size: 8.8pt; line-height: 1.55; }}
</style></head><body>

<!-- ================= PAGE 1: THE FORM ================= -->
<div class="page">
  <div class="head">
    <img src="{LOGO}" alt="">
    <div>
      <div class="t1">প্রাক্তন সবুজিয়ান পরিষদ</div>
      <div class="t2">Praktan Sabujian Parishad · alumni of Sabuj Shikshayatan Government High School</div>
      <div class="t3">সীতাকুণ্ড, চট্টগ্রাম · EIIN 105070 · প্রতিষ্ঠা ১৯৭৬</div>
    </div>
    <div class="formno">ফর্ম নং / Form no. (অফিস)<br><span class="b"></span></div>
  </div>

  <div class="titlebar">
    <div class="a"><span class="gold">সুবর্ণ জয়ন্তী ২০২৬</span> · রেজিস্ট্রেশন ফর্ম</div>
    <div class="b">Golden Jubilee 2026 · Offline registration form</div>
  </div>
  <div class="facts">
    <span>অনুষ্ঠান: <b>{EVENT_DATE}</b></span>
    <span>স্থান: <b>{VENUE}</b></span>
    <span>রেজিস্ট্রেশনের শেষ সময়: <b>{DEADLINE}</b></span>
  </div>

  <h2><span class="n">১</span> ব্যক্তিগত তথ্য <span class="en">Personal details (please write in CAPITAL letters)</span></h2>
  <div class="top">
    <div>
      <div class="grid">
        {line("পূর্ণ নাম (বাংলায়)", "Name in Bangla")}
        {line("পূর্ণ নাম (ইংরেজিতে) *", "Name in English")}
      </div>
      <div class="row"><span class="bn">এসএসসি ব্যাচ (পাসের সাল) *</span> <span class="en">SSC batch</span> {boxes(4)}
        &nbsp;&nbsp;<span class="bn">রোল নং</span> <span class="en">Roll</span> <span class="blank" style="min-width:26mm"></span></div>
      <div class="row"><span class="bn">বিভাগ:</span>
        {check("বিজ্ঞান <span class='en'>Science</span>")}{check("ব্যবসায় শিক্ষা <span class='en'>Business</span>")}{check("মানবিক <span class='en'>Humanities</span>")}</div>
      <div class="row tight"><span class="bn">রক্তের গ্রুপ</span> <span class="en">Blood group (optional)</span>
        {"".join(check(g) for g in ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"])}</div>
      <div class="row"><span class="bn">মোবাইল নম্বর *</span> <span class="en">Mobile</span> {boxes(11)}</div>
    </div>
    <div class="photo">পাসপোর্ট সাইজ ছবি<br>এখানে লাগান<br><br><span class="en">Paste a recent passport-size photo</span></div>
  </div>
  <div class="grid3">
    {line("পেশা", "Profession")}
    {line("পদবী", "Designation")}
    {line("কোম্পানি", "Company")}
  </div>
  <div class="grid">
    {line("ইমেইল", "Email (for your account and ticket)")}
    {line("ঠিকানা", "Present address")}
  </div>

  <h2><span class="n">২</span> রেজিস্ট্রেশন ফি <span class="en">Registration fee — tick and fill in</span></h2>
  <table class="fee">
    <tr><th></th><th>বিবরণ <span class="en">Item</span></th><th class="c">সংখ্যা</th><th class="r">হার</th><th class="amt">টাকা</th></tr>
    {fee_rows}
    <tr><td>{check('')}</td><td><span class="bn">স্বামী / স্ত্রী</span> <span class="en">Spouse (max 1)</span> — নাম: <span class="blank" style="min-width:45mm"></span></td><td class="c"><span class="blank"></span></td><td class="r">৳{SPOUSE_FEE}</td><td class="amt"></td></tr>
    <tr><td>{check('')}</td><td><span class="bn">সন্তান (৫ বছর বা তদূর্ধ্ব)</span> <span class="en">Children aged 5+ (under 5: free)</span></td><td class="c"><span class="blank"></span></td><td class="r">৳{CHILD_FEE}</td><td class="amt"></td></tr>
    <tr class="total"><td></td><td colspan="3">সর্বমোট <span class="en">Total to pay</span></td><td class="amt">৳</td></tr>
  </table>
  <div class="row" style="margin-top:2mm"><span class="bn">টি-শার্টের সাইজ:</span> {check("S")}{check("M")}{check("L")}{check("XL")}{check("XXL")}
    &nbsp; {check("স্বেচ্ছাসেবক হতে চাই <span class='en'>I'd like to volunteer</span>")}</div>

  <h2><span class="n">৩</span> পেমেন্ট <span class="en">Payment — cash or Bangla QR</span></h2>
  <div class="pay">
    <div class="paycard">{check("<b>নগদ টাকা · Cash</b>")}<br>কমিটির সদস্যের কাছে টাকা দিয়ে নিচের রসিদ নিন।<br><span class="en">Pay a committee member and take the receipt at the bottom.</span></div>
    <div class="paycard qrcard"><div class="qr">{QR_BOX}</div><div>{check("<b>বাংলা QR · Bangla QR</b>")}<br>যেকোনো ব্যাংক / MFS অ্যাপ দিয়ে স্ক্যান করে পেমেন্ট করুন, তারপর ট্রানজেকশন আইডি লিখুন।<br><span class="en">{QR_MERCHANT}<br>{QR_BANK} · {QR_ACCOUNT}</span></div></div>
  </div>
  <div class="row"><span class="bn">ট্রানজেকশন আইডি</span> <span class="en">Transaction ID (Bangla QR)</span> {boxes(14)}</div>

  <h2><span class="n">৪</span> প্রমাণপত্র <span class="en">Proof that you studied at the school — attach a photocopy</span></h2>
  <div class="row">{check("এসএসসি সনদ <span class='en'>SSC certificate</span>")}{check("প্রশংসাপত্র <span class='en'>Testimonial</span>")}{check("মার্কশিট <span class='en'>Marksheet</span>")}</div>

  <div class="declare">
    আমি ঘোষণা করছি যে উপরের সব তথ্য সত্য এবং আমি সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়ের প্রাক্তন শিক্ষার্থী। কমিটি পেমেন্ট ও প্রমাণপত্র যাচাই করে আমার রেজিস্ট্রেশন নিশ্চিত করবে; এই রেজিস্ট্রেশনের মাধ্যমে আমি পরিষদের সদস্য হব।
  </div>
  <div class="sign"><div>স্বাক্ষর <span class="en">Signature</span></div><div>তারিখ <span class="en">Date</span></div></div>


  <div class="howto"><b>জমা দেওয়ার নিয়ম:</b> ছবি লাগান, প্রমাণপত্রের ফটোকপি সংযুক্ত করুন, পেমেন্ট করুন এবং {DEADLINE}-এর মধ্যে ফর্মটি কমিটির সদস্যের কাছে জমা দিন। নিশ্চিত হলে টিকিটের QR কোড পাবেন। একটি মোবাইল নম্বরে একটিই রেজিস্ট্রেশন। <span class="en">{EMAIL}</span></div>

  <div class="office">
    <div class="h">অফিস কর্তৃক পূরণীয় · For office use only</div>
    <div class="grid4">
      {line("গ্রহণকারী", "Received by")}
      {line("তারিখ", "Date")}
      {line("প্রাপ্ত টাকা", "Amount (৳)")}
      {line("রসিদ নং", "Receipt no.")}
    </div>
    <div class="row">{check("পেমেন্ট যাচাই <span class='en'>Payment checked</span>")}{check("প্রমাণপত্র যাচাই <span class='en'>Proof checked</span>")}{check("ছবি আছে <span class='en'>Photo</span>")}
      <span class="bn">অনলাইনে এন্ট্রি</span> <span class="en">Entered online by / date</span> <span class="blank" style="min-width:52mm"></span></div>
  </div>

  <div class="cut"><span>✂ এখান থেকে কেটে সদস্যকে দিন · cut and give to the member</span></div>

  <div class="receipt">
    <div class="h">
      <img src="{LOGO}" alt="">
      <div>
        <div class="t">প্রাপ্তি রসিদ · Money receipt</div>
        <div class="en">সুবর্ণ জয়ন্তী ২০২৬ · প্রাক্তন সবুজিয়ান পরিষদ</div>
      </div>
      <div class="formno">রসিদ নং / Receipt no.<br><span class="b"></span></div>
    </div>
    <div class="grid3">
      {line("নাম", "Name")}
      {line("এসএসসি ব্যাচ", "SSC batch")}
      {line("মোবাইল", "Mobile")}
    </div>
    <div class="row">{line("প্রাপ্ত টাকা", "Amount (৳)", "inline")}{check("নগদ <span class='en'>Cash</span>")}{check("বাংলা QR <span class='en'>Bangla QR</span>")} <span class="en">TrxID</span> <span class="blank" style="min-width:48mm"></span></div>
    <div class="sign"><div>গ্রহণকারীর স্বাক্ষর <span class="en">Received by (signature)</span></div><div>তারিখ <span class="en">Date</span></div></div>
  </div>
</div>
</body></html>"""


def main() -> None:
    # Playwright's Chromium: headless Edge silently writes nothing while Edge itself is open.
    from playwright.sync_api import sync_playwright

    src = HERE / "_form.html"
    src.write_text(HTML, encoding="utf-8")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto(src.as_uri(), wait_until="networkidle")
            page.pdf(path=str(OUT), prefer_css_page_size=True, print_background=True)
            browser.close()
    finally:
        src.unlink(missing_ok=True)
    print(f"{OUT.name} {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
