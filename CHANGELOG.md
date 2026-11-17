# Changelog

All notable changes to the প্রাক্তন সবুজিয়ান পরিষদ (Praktan Sabujian Parishad) alumni site,
https://www.exsabujian.org. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/): a fix raises the last number
(1.0.1), a new feature the middle one (1.1.0), a change that breaks existing use the first (2.0.0).
How to cut a release: [docs/RELEASING.md](docs/RELEASING.md).

## [Unreleased]

### Added
- **Unread message reminders:** when a direct message is still unread an hour after it
  arrived, the member gets an email, and an SMS on a verified number, at most every 6
  hours. The reminder says how many messages and from whom, never what they say. Members
  turn either off in Settings → Notifications; admins have site-wide switches in Admin →
  Settings → SMS & verification.

### Fixed
- A message that arrives while its conversation is open on screen now counts as read.

## [1.4.0] - 2026-11-18

### Added
- Members whose mobile number is not verified see a reminder on their profile and
  dashboard, and once in their notifications. "Verify now" on the profile sends an SMS
  code and confirms it in a minute; the reminder goes away for good once verified.

### Changed
- Verifying the mobile number already on the profile is optional: the profile saves
  without an SMS code. A new number still needs one.

## [1.3.0] - 2026-11-17

### Added
- Accounts → Reports has a **Charts** tab: income and expense by month, total money held
  over time, where the money came from and went (by category), and the money in each
  account, for any dates up to five years. The charts print too.

### Fixed
- Opening Reports from a link to a tab (for example an account's cash book from the
  overview) could keep showing "Working it out…": an earlier answer replaced the newer one.

## [1.2.0] - 2026-11-17

### Added
- /.well-known/security.txt (RFC 9116) says where to report a security problem: the
  association's email, renewed daily so it never expires. /security.txt points there.

### Fixed
- Emails about another person (new registrations and contact messages to the committee,
  job applications, mentorship requests and answers) landed in spam. They no longer set
  Reply-To to that person's own address; a "Write to …" button in the email does the job.

## [1.1.0] - 2026-11-16

### Added
- The admin panel footer shows the running version, linked to its release notes on GitHub.

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

[Unreleased]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/shauncuier/sshs-alumni_NextJS/releases/tag/v1.0.0
