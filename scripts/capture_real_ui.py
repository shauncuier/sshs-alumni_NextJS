import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "docs" / "ui-screenshots"
OUT.mkdir(parents=True, exist_ok=True)
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def capture_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=EDGE, headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            device_scale_factor=2, # high-res retina screenshots
            locale="en-US"
        )
        page = context.new_page()

        print("Navigating to http://localhost:3000/register ...")
        page.goto("http://localhost:3000/register", wait_until="networkidle")
        page.wait_for_selector("form", timeout=15000)
        time.sleep(1)

        # 1. Fill Step 1 form fields
        print("Filling Step 1 details...")
        name_input = page.locator("input[type='text']").first
        if name_input.is_visible():
            name_input.fill("Mohammad Rafiqul Islam")

        # SSC Batch selector
        selects = page.locator("select")
        if selects.count() > 0:
            # find batch select
            for i in range(selects.count()):
                sel = selects.nth(i)
                html = sel.inner_html()
                if "1998" in html or "Batch" in html:
                    sel.select_option("1998")
                    break

        # Roll and other fields
        text_inputs = page.locator("input[type='text']")
        for i in range(text_inputs.count()):
            inp = text_inputs.nth(i)
            ph = inp.get_attribute("placeholder") or ""
            lbl = inp.evaluate("el => el.closest('div')?.innerText || ''")
            if "roll" in ph.lower() or "roll" in lbl.lower():
                inp.fill("104")
            elif "section" in ph.lower() or "section" in lbl.lower():
                inp.fill("A")

        # Blood group select
        for i in range(selects.count()):
            sel = selects.nth(i)
            html = sel.inner_html()
            if "B+" in html or "A+" in html:
                try:
                    sel.select_option("B+")
                except:
                    pass

        # Email & Phone & Password
        email_input = page.locator("input[type='email']")
        if email_input.is_visible():
            email_input.fill("rafiqul.ssghs98@gmail.com")

        tel_input = page.locator("input[type='tel']")
        if tel_input.is_visible():
            tel_input.fill("01712345678")

        pass_input = page.locator("input[type='password']")
        if pass_input.is_visible():
            pass_input.fill("P@ssword2026")

        # Proof type
        for i in range(selects.count()):
            sel = selects.nth(i)
            html = sel.inner_html()
            if "SSC_CERTIFICATE" in html or "certificate" in html.lower():
                try:
                    sel.select_option(value="SSC_CERTIFICATE")
                except:
                    pass

        # Upload sample photo if input file exists
        file_inputs = page.locator("input[type='file']")
        sample_img = ROOT / "public" / "icon-512.png"
        if file_inputs.count() > 0 and sample_img.exists():
            try:
                file_inputs.nth(0).set_input_files(str(sample_img))
            except Exception as e:
                print("Photo upload note:", e)

        # Upload proof file if exists
        if file_inputs.count() > 1 and sample_img.exists():
            try:
                file_inputs.nth(1).set_input_files(str(sample_img))
            except Exception as e:
                print("Proof upload note:", e)

        time.sleep(1)

        # Capture Step 1 form container
        form_locator = page.locator("form")
        step1_shot = OUT / "ui_step1_account.png"
        form_locator.screenshot(path=str(step1_shot))
        print("Saved:", step1_shot.name, f"({step1_shot.stat().st_size // 1024} KB)")

        # Full page with banner
        full_step1_shot = OUT / "ui_register_full.png"
        page.screenshot(path=str(full_step1_shot))
        print("Saved:", full_step1_shot.name, f"({full_step1_shot.stat().st_size // 1024} KB)")

        # 2. Advance to Step 2
        print("Clicking continue button to Step 2...")
        continue_btn = page.locator("button:has-text('Continue'), button:has-text('পরবর্তী'), button[type='button']").filter(has_text="Continue")
        if continue_btn.count() == 0:
            continue_btn = page.locator("button").filter(has_text="Continue to")
        if continue_btn.count() > 0:
            continue_btn.first.click()
            time.sleep(1.5)
        else:
            # Try to trigger step 2 via react state or form click
            print("Looking for next button...")
            btns = page.locator("button")
            for i in range(btns.count()):
                b = btns.nth(i)
                txt = b.inner_text()
                if "Continue" in txt or "Next" in txt or "পরবর্তী" in txt or "Payment" in txt:
                    b.click()
                    time.sleep(1.5)
                    break

        # Check if TrxID or payment section is visible
        trx_input = page.locator("input[placeholder*='TrxID'], input[placeholder*='transaction'], input[name*='transaction']").first
        if trx_input.is_visible():
            trx_input.fill("9A7B3X91Q")

        step2_shot = OUT / "ui_step2_payment.png"
        form_locator.screenshot(path=str(step2_shot))
        print("Saved:", step2_shot.name, f"({step2_shot.stat().st_size // 1024} KB)")

        # 3. Capture Jubilee Landing Page in Mobile
        print("Capturing Jubilee mobile landing page...")
        mobile_page = context.new_page()
        mobile_page.set_viewport_size({"width": 390, "height": 844})
        mobile_page.goto("http://localhost:3000/jubilee", wait_until="networkidle")
        time.sleep(1)
        jubilee_shot = OUT / "ui_mobile_jubilee.png"
        mobile_page.screenshot(path=str(jubilee_shot))
        print("Saved:", jubilee_shot.name, f"({jubilee_shot.stat().st_size // 1024} KB)")

        # 4. Capture Card & Ticket Preview
        print("Capturing Card preview from /card or /dashboard...")
        card_page = context.new_page()
        card_page.set_viewport_size({"width": 1200, "height": 800})
        card_page.goto("http://localhost:3000/card", wait_until="networkidle")
        time.sleep(1)
        card_shot = OUT / "ui_card_preview.png"
        card_page.screenshot(path=str(card_shot))
        print("Saved:", card_shot.name, f"({card_shot.stat().st_size // 1024} KB)")

        browser.close()
        print("All UI screenshots successfully captured!")

if __name__ == "__main__":
    capture_ui()
