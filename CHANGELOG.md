# Changelog

All notable changes to the প্রাক্তন সবুজিয়ান পরিষদ (Praktan Sabujian Parishad) alumni site,
https://www.exsabujian.org. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/): a fix raises the last number
(1.0.1), a new feature the middle one (1.1.0), a change that breaks existing use the first (2.0.0).
How to cut a release: [docs/RELEASING.md](docs/RELEASING.md).

## [Unreleased]

## [1.0.0] - 2026-11-16

The site as it runs in production at https://www.exsabujian.org (live since 2026-10-28).
This is the first numbered version; earlier work is in the git history.

### Membership and events
- Joining through the Golden Jubilee registration: profile photo, proof of study, payment
  details and committee approval; the new account stays pending until approved.
- Mobile number verified by SMS code (email code only while SMS is down); one number per
  account. Admins can switch codes off in Admin → Bulk SMS.
- Manual payments by bKash, Nagad, Bangla QR, bank or cash, with a payment screenshot; the
  receipt reader fills in the transaction ID. Payment methods are managed in Admin → Payment settings.
- Events with guest prices, coupons and batch-based fees; QR tickets and gate check-in with
  the phone camera; printable registration forms and a souvenir list with photos.
- Donations during registration and on /donate, verified by the committee, with emailed receipts.

### Members
- Alumni directory, member profiles, batches, digital ID card, network, messages,
  notifications, feed, careers board and mentorship.
- Women's profile photos are hidden from everyone except admins unless the member shows them.
- Editing a profile asks for an SMS code once when the number on file was never verified.
- **Forgot password:** /forgot-password resets the password with an SMS code to the number
  on the account; every session is signed out afterwards.

### Association
- About, school, teachers (head teachers, current, office staff, former), committee and past
  committees, constitution, honor board, notices, news, gallery, stories, achievements,
  sponsors, magazine submissions, volunteers and the Golden Jubilee page with videos.

### Administration
- Admin panel with roles and permissions: verifications queue, users, events, payments,
  donations, accounts (vouchers, approvals, reports), bulk SMS, content sections and an
  activity log of every write action and sign-in.

### Security
- Cloudflare Turnstile robot check on sign-in, sending codes, joining, contact, magazine and
  password reset; the site sits behind Cloudflare and reads the real visitor address from it.
- Strict security headers (CSP, HSTS), same-origin checks, rate limits, sealed QR tokens,
  private storage for proofs, receipts and vouchers.

### Fixed (2026-11-15 to 2026-11-16)
- Robot check refused every real visitor because the allowed site address lacked the www form.
- The payment-screenshot reader crashed the server: its WebAssembly file was not shipped.
- Batch share images (/batches/[year]/opengraph-image) returned server errors: their fonts
  were not shipped. The email logo was missing for the same reason.
- A donation made while registering now shows on the verification page.

[Unreleased]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/shauncuier/sshs-alumni_NextJS/releases/tag/v1.0.0
