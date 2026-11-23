# Changelog

All notable changes to the প্রাক্তন সবুজিয়ান পরিষদ (Praktan Sabujian Parishad) alumni site,
https://www.exsabujian.org. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/): a fix raises the last number
(1.0.1), a new feature the middle one (1.1.0), a change that breaks existing use the first (2.0.0).
How to cut a release: [docs/RELEASING.md](docs/RELEASING.md).

## [Unreleased]

## [1.7.5] - 2026-11-23

### Fixed
- **Short database hiccups no longer show as errors.** When the hosting's database was
  slow for a moment to accept a new connection (more than 1 second), the site gave up and
  the page failed. It now waits up to 5 seconds, so a brief slowdown only makes that page
  load a little slower.

## [1.7.4] - 2026-11-23

### Fixed
- **Database outages, second part.** The hourly check added in 1.7.3 showed that the
  hosting closes a database connection after 20 seconds without use, and the site then
  opened a new one straight away to keep a spare: thousands of new connections an hour,
  which can set off the hosting's protection. The site now keeps no spare connections
  and closes unused ones itself after 15 seconds, so a quiet site opens none at all.

## [1.7.3] - 2026-11-23

### Fixed
- **Fewer database outages.** Hostinger found why the site kept losing its database
  permissions: it held too many database connections open at once, and Hostinger's
  automatic protection then blocks the account. Each server process now shares one
  connection pool of at most 5 connections and closes idle ones after 5 minutes, instead
  of keeping 10 open per pool for good.

### Added
- Once an hour the server log records how many connections each database has open, the
  connection limits the hosting applies, and how long a query takes on the main database and on the standby copy, to keep an eye on the
  fix above and to see whether the standby could serve as the main database.

## [1.7.2] - 2026-11-20

### Security
- A library used by the database build tool (`effect`, through Prisma) is pinned to its
  patched version, which fixes a published advisory (GHSA-7589-6fvf-x4pw). It ran only
  while building the site, never on visitor input; `npm audit` now reports nothing.

## [1.7.1] - 2026-11-20

### Fixed
- Search engines get the 192 px logo as the site icon too (Google wants a size that is a
  multiple of 48 px), so the logo can show next to the site in search results.

## [1.7.0] - 2026-11-19

### Added
- **The site keeps working when the database fails.** Public pages (home, teachers,
  committee, notices, news, events, gallery and the rest) show their last saved information
  instead of empty lists or an error page, with a small notice that it may be a little old.
- An optional standby copy of the database, updated every few minutes: when the main
  database fails, the whole site (members' pages and the admin panel too) switches to the
  copy by itself, browsing works as usual and only saving waits until the main database is
  back. Switched on by setting `STANDBY_DATABASE_URL`. The copy never holds passwords or
  the sign-in log, and uploaded documents and photos stay on our own server; while the
  copy is in use, members already signed in stay signed in and new sign-ins wait. The
  privacy section of the terms page names where the copy is kept.
- Admin → Settings → Database: choose how often the standby copy runs (2 to 30 minutes,
  5 by default) and see when the last copy ran and whether it worked.

### Changed
- When the database fails, forms and sign-in say "briefly unavailable, try again in a few
  minutes" instead of "Something went wrong", and a page that cannot load because of the
  database says "Back in a few minutes" instead of showing an error reference.

## [1.6.0] - 2026-11-19

### Added
- **Database watchdog:** the site checks its database every 3 minutes. When the host drops
  the database permissions (the outages of 17 and 19 November), the super admin and the
  registration-alert addresses get an email, and the super admin a text, within about 6
  minutes, with the steps to fix it; another email follows when it works again.
- `GET /api/health` for an uptime monitor: 200 while the database works, 503 when not.

## [1.5.0] - 2026-11-18

### Added
- **Unread message reminders:** when a direct message is still unread an hour after it
  arrived, the member gets an email, and an SMS on a verified number, at most every 6
  hours, for messages from the last 2 days. The reminder says how many messages and from
  whom, never what they say. Members
  turn either off in Settings → Notifications; admins have site-wide switches in Admin →
  Settings → SMS & verification.

### Fixed
- A message that arrives while its conversation is open on screen now counts as read.

### Security
- Next.js updated from 16.4.1 to 16.4.6, which fixes a published security advisory.

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

[Unreleased]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.7.5...HEAD
[1.7.5]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.7.4...v1.7.5
[1.7.4]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.7.3...v1.7.4
[1.7.3]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.7.2...v1.7.3
[1.7.2]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/shauncuier/sshs-alumni_NextJS/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/shauncuier/sshs-alumni_NextJS/releases/tag/v1.0.0
