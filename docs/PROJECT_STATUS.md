# SSGHS Alumni Platform — Project Status

**Snapshot:** 2026-10-12 · **Branch:** `prod-readiness` (roadmap steps 1–16 done: Phase 3 security complete)
**Tests:** 284 / 284 passing (46 files, `npm test`, Vitest 4) · **Typecheck:** clean · **Lint:** 0 errors

**Next steps:** the ordered go-live plan is in [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md).

This replaces `docs/PROJECT_MILESTONES_AND_STATUS.md` (last updated 2026-09-26, describes the pre-MySQL setup) as the current picture of the project.

---

## 1. Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16.3 (App Router, Turbopack), React 19, Tailwind CSS 4 |
| Data | MySQL / MariaDB through Prisma 7 (`@prisma/adapter-mariadb`), schema applied with `prisma db push` (no migration files) |
| Auth | NextAuth 4, credentials + JWT; `sessionVersion` on `User` ends sessions on demand |
| SMS | BulkSMSBD (`lib/bulksmsbd.ts`), sandbox simulation when no API key |
| Uploads | Local disk under `UPLOADS_DIR` (avatars, proof documents, receipts), served only through authorised API routes |
| Tests | Vitest against a local `*_test` database that is wiped every run |

Size: 19 Prisma models, 44 pages, 55 API route files.

## 2. Local environment

- **One env file:** everything lives in `.env.local` (git-ignored). `.env` was merged into it on 2026-10-11. `.env.example` documents every variable.
- **One app database:** `sshs_dev` on `127.0.0.1:3306`. `next dev`, `npm run db:push`, `npm run db:seed` and every script read it through `lib/load-env.ts` (`.env.local` first, then `.env`).
- **Test database:** `sshs_test` (`TEST_DATABASE_URL`). It stays separate on purpose: each test run truncates every table, and the test setup refuses any database whose name does not end in `_test`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 (`-H 0.0.0.0` for phone testing over LAN) |
| `npm run db:push` | Legacy-column backfill, then `prisma db push` |
| `npm run db:seed` | Local only: sample data plus one account per role (see 3); blocked when `NODE_ENV=production` |
| `npm run db:seed:prod` | Production: batches, super admin, membership event only; disables accounts with old published passwords; lists leftover test accounts and demo content |
| `npm run db:remove-demo` | Delete the demo seed's sample posts, news, announcements, events and campaigns |
| `npm run env:check -- <file>` | Check a production env file (names only); the server runs the same check at start-up in production |
| `npm run privacy:cleanup` | Delete rejected applicants' photos and payment screenshots now (also runs daily) |
| `npm run db:super-admin` | Create or sync the super admin from env without a restart |
| `npm test` | Full Vitest suite |

After any change to `prisma/schema.prisma`: `npm run db:push`, then **restart `next dev`** (it keeps the old Prisma client in memory otherwise).

## 3. Accounts and roles

| Role | Can do | Local account | Password from |
| --- | --- | --- | --- |
| Super Admin (one) | Everything, including managing admins | `SUPER_ADMIN_EMAIL` | `SUPER_ADMIN_PASSWORD` |
| Admin | Admin console; manage alumni and moderators | `SEED_ADMIN_EMAIL` | `SEED_ADMIN_PASSWORD` |
| Moderator | News, gallery, stories & achievements, jobs, mentors, gate scanner (`lib/permissions.ts`); no members, money, SMS, events or logs | `SEED_MODERATOR_EMAIL` | `SEED_MODERATOR_PASSWORD` |
| Alumni | Member features once verified | `SEED_ALUMNI_EMAIL` | `SEED_ALUMNI_PASSWORD` |

The super admin is defined only by env. It is created or restored (role, status, password) at every server start (`instrumentation.ts`). The console cannot grant `SUPER_ADMIN` or edit that account, and its password cannot be changed from Settings.

## 4. Feature status

**Live** = backed by the database and tested. **Partial** = works, with gaps noted. No section runs on sample data any more (roadmap step 10).

| Area | Status | Notes |
| --- | --- | --- |
| Joining (Golden Jubilee registration) | Live | Photo, proof of study, payment details, admin approval; creates PENDING account |
| Contact verification on joining | Live | Phone by SMS code (template `Your {Brand} OTP is XXXX`, `OTP_BRAND_NAME`); if the SMS fails or does not arrive, the member gets the code by email instead. One verified contact is required. **Email needs Resend or SMTP in production** — none is configured yet, so locally the emailed code is printed in the `next dev` console |
| Payment methods on registration | Live | bKash, Nagad, **Bangla QR**, Bank, Cash — manual: member pays, enters transaction ID, committee approves. Bangla QR shows the image from `NEXT_PUBLIC_BANGLA_QR_IMAGE` |
| Events, tickets, gate check-in | Live | QR tickets (sealed tokens); gate is typed/pasted, no camera |
| Admin verifications queue | Live | Approve/reject payment + membership together |
| User management (`/admin/users`) | Live | Search, add, role change, reset password, disable/enable; every change signs the user out |
| Bulk SMS broadcast (`/admin/sms`) | Live | History in the `SmsBroadcast` table with the full recipient list; failed sends recorded |
| Alumni directory, profiles, ID card, wallet passes | Live | Phone/email shown only when the member made them public |
| Donations | Live | Manual: donor pays by bKash / Nagad / Bangla QR / bank / cash and submits the transaction ID; admins verify or reject in `/admin/donations`; verified ones count and get an emailed receipt. Admins create, edit, close and delete campaigns there; only open campaigns (active, started, not ended) take donations |
| Online payments (bKash, Nagad, SSLCommerz APIs) | Off | Decision 2026-10-11: manual payment only. Checkout returns 410 unless `ONLINE_PAYMENTS_ENABLED=true`; code kept for later |
| Activity log (`/admin/logs`) | Live | Every write action, sign-in and security event: who, what, outcome, IP, browser; secrets never stored; kept `LOG_RETENTION_DAYS` (365) |
| Messages | Live | Real conversations, `/messages?to=<member>`, live updates, unread counts; only active members can be messaged |
| Notifications, realtime (SSE), web push | Partial | Header bell and `/notifications` show the member's real notifications (messages, comments on their posts, committee notices), mark as read; web push sending is a stub |
| Committee volunteers | Live | `Volunteer` table; admins approve/decline in `/admin/volunteers`; old JSON entries imported with `npm run db:import-volunteers` |
| Feed / posts | Live | Members only; posts, likes and comments stored; authors delete their own, admins and moderators delete any |
| Batches | Live | Every SSC year from 1985; member counts from verified profiles; representative, contact, reunion date set in `/admin/batches` |
| News | Live | `/admin/news` (write, publish, feature, delete, image upload); `/news` and `/news/[id]` show published articles only |
| Gallery | Live | `/admin/gallery` (albums, multi-photo upload, captions, cover, publish); `/gallery` and the homepage show published albums only |
| Stories, achievements | Live | `/admin/stories` (two tabs); `/stories`, `/stories/[id]`, `/achievements`, homepage and sitemap show published entries only |
| Careers / job board | Live | Verified members post, admins approve in `/admin/jobs`; applications stored and emailed to the poster; `/careers/mine` for posters |
| Mentorship | Live | Members apply as mentors, admins approve in `/admin/mentors`; requests stored and emailed; mentors accept with real meeting details in `/mentorship/mine` |
| Network | Live | Directory of verified members with search, batch filter, profile and message buttons |
| Dashboard widgets | Live | Real feed, batch, classmates, events and campaign; empty states when there is nothing yet |

## 5. Security review — 2026-10-11

Scope: everything changed on this branch, plus a sweep of all 55 API routes for authentication, same-origin and rate-limit coverage.

### Fixed

| # | Issue | Fix |
| --- | --- | --- |
| 1 | **Bulk SMS could text strangers.** The SMS contact list always included the sample alumni and batch representatives from `lib/data.ts` and the 5 sample volunteers, with real-looking numbers. "Select all" would message whoever owns those numbers and spend credits. | Sample sources removed from `app/api/admin/sms/contacts`; sample volunteers excluded (`isSampleVolunteer`). |
| 2 | Bulk SMS send had no recipient limit or rate limit. | Max 5,000 numbers per send, 30 sends per hour per IP. |
| 3 | Bulk SMS send: no same-origin check, malformed JSON gave a 500 that echoed the internal error message. | `requireSameOrigin`, `readJsonBody` (400), generic 500 message. History file moved under `UPLOADS_DIR`. |
| 4 | OTP endpoint could be used for SMS pumping by rotating IPs and numbers. | Site-wide cap of 200 OTP SMS per hour on top of per-IP (10/h) and per-number (1/min, 5/h) limits. |
| 5 | Admin write routes (events create/update/delete, registration decisions, verifications, notifications, push send) had no same-origin check. | `requireSameOrigin` added to each. |
| 6 | Real BulkSMSBD API key in the uncommitted `.env.example`. | Blanked before any commit; never entered git history. |
| 7 | Test suite loaded `.env.local`, so a test could send real SMS with the live key. | `vitest.config.ts` blanks the SMS keys. |
| 8 | Disabled / demoted staff had no way to be locked out (staff skipped status checks). | `User.disabledAt`; checked at sign-in and on every session lookup, for all roles. |

### Checked and fine

- Every `/api/admin/*` route checks for an admin session; the admin layout returns 403 for non-admins.
- Media routes (avatars, proofs, receipts) check the session; `uploads/` is not under `public/`.
- SSLCommerz IPN verifies the hash and re-validates the transaction with the gateway.
- Alumni directory hides private phone and email; wallet pass routes require a signed card token.
- OTP codes and "phone verified" tokens are AES-GCM sealed with `NEXTAUTH_SECRET`; codes compared in constant time; 5 tries per code.

### Remaining risks (not fixed)

- **Rate limits are in memory, per server process.** With several instances or after a restart the counters reset. Fine for one VPS; use a shared store (Redis) if the app is scaled out.
- `braces` (high, dev-only, inside ESLint): no fixed version exists yet; it only matches the project's own lint patterns. `npm audit --omit=dev` is clean.
- **Email reaches only the Resend account owner until a domain is verified.** Resend is configured (send-only key) with the test sender `onboarding@resend.dev`; replies and contact-form messages go to `sabujshikshayatanalumni@gmail.com`. Members (email codes, receipts, approvals) get nothing until the association's domain is verified in Resend (roadmap step 17, waits for step 3).

## 6. Known issues and backlog

- **Remote (production) database not migrated.** Needs backup, then `npm run db:push` (adds `disabledAt` and earlier event/RSVP changes) and `npm run db:seed:prod`. Checklist: `docs/DATABASE_SETUP.md`. Deploying before that breaks sign-in.
- Admin pages are only partly responsive on phones (users page is responsive; others are not yet).
- Gate scanner has no camera yet (roadmap step 22); the headers already allow the camera on this site.
- `sitemap.ts` is generated at build time.
- `sshs_dev` contains test accounts and test events from earlier sessions.

## 7. Before going live

1. Merge `feat/sms-otp-registration` after review.
2. Back up and migrate the production database (section 6).
3. Production env: own `NEXTAUTH_SECRET`; `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (verified sending domain); `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`; BulkSMSBD key and sender ID; `OTP_BRAND_NAME` matching the approved OTP template; `NEXT_PUBLIC_BANGLA_QR_IMAGE` and `NEXT_PUBLIC_BANGLA_QR_MERCHANT` with the bank-issued QR.
4. Send one real OTP and one small broadcast to a committee phone to confirm the gateway accepts the template and sender ID.

## 8. Recent work (this branch)

- SMS OTP verification during joining (BulkSMSBD), with email OTP as the fallback; shared code core in `lib/otp.ts`.
- BulkSMSBD client and admin bulk SMS page.
- User management and the env-defined super admin; `User.disabledAt`.
- Seed: one account per role.
- Single `.env.local`; scripts load it through `lib/load-env.ts`.
- Bangla QR payment option.
- Security fixes in section 5.
- Roadmap steps 1–10 on `prod-readiness`: activity log, manual donations, volunteers and SMS history in the database, news / gallery / stories / careers / mentorship / network from the database, moderator permissions, page navigation without full-screen loader, sample data removed (feed, batches, dashboard, notifications rebuilt on real data), production-safe seed (`db:seed:prod`, `db:remove-demo`), donation campaigns managed in admin, production env check (`docs/PRODUCTION_ENV.md`), same-origin check and body caps on every write route, dependency fixes (real `mariadb` driver was 3.4.5) and stricter security headers, privacy clean-up of rejected applicants (`docs/DATA_RETENTION.md`), membership-flag guard.
- Dev fix: a leftover PWA service worker served old JavaScript in `next dev` (hydration mismatch); dev now removes it.
