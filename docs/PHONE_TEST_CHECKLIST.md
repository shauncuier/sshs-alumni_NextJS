# Join flow on real phones (roadmap step 23)

Do this once on an **Android phone with Chrome** and once on an **iPhone with Safari**, both on **mobile data** (Wi-Fi off), as two different people who are not members yet. Tick each line; write down anything that is slow, confusing or broken.

## Before you start

- [ ] The site is reachable from the internet over **https**: the live site, or for a test from this PC `ngrok http 3000` (ngrok addresses are already allowed by the dev server).
- [ ] Admin → Donations → **Payment details**: the real bKash / Nagad numbers and the bank's Bangla QR are saved.
- [ ] Admin → Events → Golden Jubilee → Pricing: **Use association details** applied and saved (no made-up numbers in the instructions).
- [ ] BulkSMSBD has at least ৳20 balance (`npm run sms:test` shows it) and the OTP template is approved.
- [ ] Each tester has: a clear photo of themselves (face, at least 600 × 600), a photo or PDF of their SSC certificate / marksheet / school ID, and a bKash or Nagad account for a small real payment.

## On each phone

| # | Step | What should happen | Android | iPhone |
| --- | --- | --- | --- | --- |
| 1 | Open the site, tap **Events → Golden Jubilee → Join & register** | The form fits the screen; nothing scrolls sideways | ☐ | ☐ |
| 2 | **Profile photo**: pick from the gallery, then try taking one with the camera | Preview shows. A HEIC photo gets a clear "take a screenshot / set JPEG" message | ☐ | ☐ |
| 3 | Fill name, email, password, mobile, SSC batch (must be chosen; nothing pre-selected), roll, section | Keyboard matches the field (email, numbers, phone); the page does not zoom in when typing | ☐ | ☐ |
| 4 | **Proof of study**: choose the type, upload the photo/PDF | File name and size show; over 10 MB is refused with a clear message | ☐ | ☐ |
| 5 | **Send code** to the mobile number | SMS `Your SSGHS Alumni OTP is XXXX` arrives within a minute | ☐ | ☐ |
| 6 | Enter the code | "Verified" shows next to the number | ☐ | ☐ |
| 7 | (Once, on one phone) Tap **SMS not arriving? Get the code by email** | The code is emailed instead; the email arrives (only after the domain is verified in Resend — step 17) | ☐ | ☐ |
| 8 | **Continue to registration & payment**, choose a package | Total updates for extra adults / children | ☐ | ☐ |
| 9 | Pay with **bKash / Nagad** to the shown number, or scan the **Bangla QR** with the banking app | The number and QR are the association's real ones | ☐ | ☐ |
| 10 | Enter the **transaction ID**, submit | Confirmation: "waiting for the committee"; you cannot sign in yet | ☐ | ☐ |
| 11 | Switch the phone to aeroplane mode for a moment, submit again (on a new attempt) | A clear error, no blank page; nothing is lost when the connection comes back | ☐ | ☐ |

## Committee, from a phone

| # | Step | What should happen | ☐ |
| --- | --- | --- | --- |
| 12 | Admin → **Verify Docs**: open each new applicant | Photo, proof and payment are visible; Approve / Reject stay at the bottom of the screen | ☐ |
| 13 | Check the transaction IDs in the bKash / Nagad / bank statement, then **Approve** both | "Approved and payment confirmed" | ☐ |
| 14 | Each tester signs in | Dashboard, digital card and ticket QR work | ☐ |
| 15 | At the gate page (`/gate`, https), scan both tickets with the camera | LET IN; a second scan says "Already checked in" | ☐ |

**Done when** both phones get through steps 1–10 without help, and step 13 approves both.

Problems found: write them in `docs/PROJECT_STATUS.md` under "Known issues", or tell the developer with the phone model, browser and step number.
