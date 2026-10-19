"""Screenshots of the real /jubilee registration flow on a phone-sized screen, for the guide video.

Needs the dev server on http://localhost:3000 and SMS test mode ON (codes shown on screen, no SMS);
make_video.py switches it on and off and removes the sample registration afterwards.
Writes design/guide-video/shots/NN-name.png.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import Page, sync_playwright

HERE = Path(__file__).parent
SHOTS = HERE / "shots"
BASE = "http://localhost:3000"

# Obviously fictional sample data.
SAMPLE = {
    "name": "Rahim Uddin (Sample)",
    "email": "sample.member@example.com",
    "password": "Sample-Pass-2026",
    "phone": "01712345678",
    "batch": "2016",
    "roll": "42",
    "trx": "BQR7X2K9MP",
}


def sample_images() -> tuple[Path, Path]:
    """A plain avatar and a 'SAMPLE' certificate, so no real person or document appears."""
    font = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 64)
    small = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 40)
    avatar = Image.new("RGB", (800, 800), "#d9e7e0")
    d = ImageDraw.Draw(avatar)
    d.ellipse((250, 140, 550, 440), fill="#7a9a8b")
    d.rounded_rectangle((150, 470, 650, 860), radius=180, fill="#7a9a8b")
    d.text((400, 60), "SAMPLE", font=font, fill="#06281e", anchor="mm")
    a = SHOTS / "_sample-photo.jpg"
    avatar.save(a, quality=90)
    cert = Image.new("RGB", (1200, 850), "#fbf7ea")
    d = ImageDraw.Draw(cert)
    d.rectangle((30, 30, 1170, 820), outline="#b8892a", width=10)
    d.text((600, 160), "SSC CERTIFICATE", font=font, fill="#06281e", anchor="mm")
    d.text((600, 300), "SAMPLE DOCUMENT — NOT REAL", font=small, fill="#9f1239", anchor="mm")
    d.text((600, 420), "Sabuj Shikshayatan Govt. High School", font=small, fill="#333", anchor="mm")
    c = SHOTS / "_sample-certificate.jpg"
    cert.save(c, quality=90)
    return a, c


def focus(page: Page, selector: str, *, block: str = "center") -> None:
    """Scroll an element into view and outline it, as in a tutorial."""
    page.evaluate(
        """([sel, block]) => {
          document.querySelectorAll('[data-guide]').forEach((el) => { el.style.outline = ''; el.style.boxShadow = ''; el.removeAttribute('data-guide'); });
          const el = document.querySelector(sel);
          if (!el) return;
          el.setAttribute('data-guide', '1');
          el.style.outline = '4px solid #f59e0b';
          el.style.outlineOffset = '4px';
          el.style.boxShadow = '0 0 0 12px rgba(245, 158, 11, 0.25)';
          el.scrollIntoView({ block, behavior: 'instant' });
        }""",
        [selector, block],
    )
    page.wait_for_timeout(400)


def clear_focus(page: Page) -> None:
    page.evaluate("document.querySelectorAll('[data-guide]').forEach((el) => { el.style.outline = ''; el.style.boxShadow = ''; el.removeAttribute('data-guide'); })")


def shot(page: Page, name: str) -> None:
    # The SMS test mode note is for testing only; the video shows what members see.
    page.evaluate("document.querySelectorAll('p[role=status]').forEach((p) => { if (p.textContent.includes('TEST MODE')) p.style.display = 'none'; })")
    # The dev server's "N" badge is not part of the site.
    page.evaluate("document.querySelectorAll('nextjs-portal').forEach((el) => { el.style.display = 'none'; })")
    page.screenshot(path=str(SHOTS / f"{name}.png"))
    print("shot", name)


def card_of(selector: str) -> str:
    """The surrounding block of a field (label + input), for a roomier highlight."""
    return f"{selector}"


def main() -> None:
    SHOTS.mkdir(exist_ok=True)
    photo, cert = sample_images()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 412, "height": 860}, device_scale_factor=2.6, is_mobile=True, has_touch=True, locale="en-GB")
        page = ctx.new_page()
        page.goto(f"{BASE}/jubilee", wait_until="networkidle", timeout=180_000)
        page.wait_for_timeout(1500)

        shot(page, "01-open-link")
        focus(page, "a[href='#register']", block="end")
        shot(page, "02-fees")

        page.click("a[href='#register']")
        page.wait_for_selector("#reg-photo", timeout=60_000)
        page.set_input_files("#reg-photo", str(photo))
        page.wait_for_timeout(1200)
        focus(page, "#reg-photo", block="start")
        page.evaluate("window.scrollBy(0, -120)")
        shot(page, "03-photo")

        page.fill("#reg-name", SAMPLE["name"])
        page.fill("#reg-email", SAMPLE["email"])
        page.fill("#reg-password", SAMPLE["password"])
        focus(page, "#reg-email")
        shot(page, "04-name-email-password")

        page.fill("#reg-phone", SAMPLE["phone"])
        focus(page, "#reg-phone")
        shot(page, "05-mobile")
        page.get_by_role("button", name="Send code").click()
        page.wait_for_selector("#reg-phone-otp", timeout=30_000)
        page.wait_for_timeout(500)
        focus(page, "#reg-phone-otp")
        shot(page, "06-sms-code")
        page.get_by_role("button", name="Verify").click()
        page.wait_for_selector("text=Number verified by SMS", timeout=30_000)
        focus(page, "#reg-phone")
        shot(page, "07-verified")

        page.select_option("#reg-batch", SAMPLE["batch"])
        page.fill("#reg-roll", SAMPLE["roll"])
        page.select_option("#reg-section", "Business Studies")
        page.select_option("#reg-blood", "O+")
        focus(page, "#reg-batch")
        shot(page, "08-batch")

        page.select_option("#reg-proof-type", "SSC_CERTIFICATE")
        page.set_input_files("#reg-proof-file", str(cert))
        page.wait_for_timeout(1200)
        focus(page, "#reg-proof-file")
        shot(page, "09-proof")

        clear_focus(page)
        page.get_by_role("button", name="Continue to registration").click()
        page.wait_for_selector("#reg-guest-0", timeout=30_000)
        page.wait_for_timeout(600)
        page.fill("#reg-guest-0", "1")
        page.select_option("#reg-tshirt", "L")
        focus(page, "#reg-guest-0")
        shot(page, "10-guests")

        page.get_by_role("button", name="Bangla QR").click()
        page.wait_for_timeout(1200)
        focus(page, "img[alt^='Bangla QR code']")
        shot(page, "11-bangla-qr")

        page.fill("#reg-trx", SAMPLE["trx"])
        focus(page, "#reg-trx")
        shot(page, "12-transaction-id")

        clear_focus(page)
        submit = page.locator("button[type=submit]").last
        submit.scroll_into_view_if_needed()
        focus(page, "button[type=submit]")
        shot(page, "13-submit")
        clear_focus(page)
        submit.click()
        page.wait_for_selector("text=payment and membership under review", timeout=90_000)
        page.wait_for_timeout(800)
        page.evaluate("document.querySelector('[role=status]')?.scrollIntoView({ block: 'center' })")
        shot(page, "14-done")
        browser.close()


if __name__ == "__main__":
    main()
