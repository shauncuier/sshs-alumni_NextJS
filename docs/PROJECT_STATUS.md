# SSGHS Alumni Platform — Project Status

**Snapshot:** 2026-10-11 · **Branch:** `feat/sms-otp-registration` (2 commits ahead of `main`, plus uncommitted work listed below)
**Tests:** 179 / 179 passing (28 files, `npm test`) · **Typecheck:** clean · **Lint:** 0 errors

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
| `npm run db:seed` | Seed data plus one account per role (see 3) |
| `npm run db:super-admin` | Create or sync the super admin from env without a restart |
| `npm test` | Full Vitest suite |

After any change to `prisma/schema.prisma`: `npm run db:push`, then **restart `next dev`** (it keeps the old Prisma client in memory otherwise).

## 3. Accounts and roles

| Role | Can do | Local account | Password from |
| --- | --- | --- | --- |
| Super Admin (one) | Everything, including managing admins | `SUPER_ADMIN_EMAIL` | `SUPER_ADMIN_PASSWORD` |
| Admin | Admin console; manage alumni and moderators | `SEED_ADMIN_EMAIL` | `SEED_ADMIN_PASSWORD` |
| Moderator | Gate scanner, content moderation; no member, money or settings access | `SEED_MODERATOR_EMAIL` | `SEED_MODERATOR_PASSWORD` |
| Alumni | Member features once verified | `SEED_ALUMNI_EMAIL` | `SEED_ALUMNI_PASSWORD` |

The super admin is defined only by env. It is created or restored (role, status, password) at every server start (`instrumentation.ts`). The console cannot grant `SUPER_ADMIN` or edit that account, and its password cannot be changed from Settings.

## 4. Feature status

**Live** = backed by the database and tested. **Partial** = works, with gaps noted. **Mock** = UI on sample data from `lib/data.ts` / `lib/career-data.ts`, not persisted.

| Area | Status | Notes |
| --- | --- | --- |
| Joining (Golden Jubilee registration) | Live | Photo, proof of study, payment details, admin approval; creates PENDING account |
| Contact verification on joining | Live | Phone by SMS code (template `Your {Brand} OTP is XXXX`, `OTP_BRAND_NAME`); if the SMS fails or does not arrive, the member gets the code by email instead. One verified contact is required. **Email needs Resend or SMTP in production** — none is configured yet, so locally the emailed code is printed in the `next dev` console |
| Payment methods on registration | Live | bKash, Nagad, **Bangla QR**, Bank, Cash — manual: member pays, enters transaction ID, committee approves. Bangla QR shows the image from `NEXT_PUBLIC_BANGLA_QR_IMAGE` |
| Events, tickets, gate check-in | Live | QR tickets (sealed tokens); gate is typed/pasted, no camera |
| Admin verifications queue | Live | Approve/reject payment + membership together |
| User management (`/admin/users`) | Live | Search, add, role change, reset password, disable/enable; every change signs the user out |
| Bulk SMS broadcast (`/admin/sms`) | Partial | Works; history kept in a JSON file (`UPLOADS_DIR/sms-history.json`), not the database |
| Alumni directory, profiles, ID card, wallet passes | Live | Phone/email shown only when the member made them public |
| Online payments (bKash, Nagad, SSLCommerz APIs) | Not used | Decision 2026-10-11: manual payment + committee verification only. Gateway code stays but the donate page must move to manual (roadmap step 6a) |
| Activity log (`/admin/logs`) | Live | Every write action, sign-in and security event: who, what, outcome, IP, browser; secrets never stored; kept `LOG_RETENTION_DAYS` (365) |
| Messages, notifications, realtime (SSE), web push | Partial | DB-backed, with sample-data fallbacks in some pages |
| Committee volunteers | Partial | Stored in `uploads/volunteers.json`, pre-filled with 5 made-up volunteers |
| Feed / posts | Partial | API reads the DB, falls back to sample posts |
| News, stories, achievements, gallery | Mock | DB models exist (`NewsArticle`, `AlumniStory`, `Achievement`, `Gallery*`) but pages render sample data |
| Careers / jobs, mentorship | Mock | In-memory sample lists; posted jobs and bookings vanish on restart |
| Network, dashboard widgets | Mock / mixed | Built from sample alumni, batches, donations |

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
- `NEXTAUTH_SECRET` in `.env.example` is a fixed, readable value. Production must set its own (`openssl rand -base64 32`), or anyone can forge tickets, card tokens and OTP tokens.
- **No email provider configured.** `RESEND_API_KEY` / `SMTP_HOST` are empty and `nodemailer` is not installed, so every email (including the OTP fallback) only prints to the server console. In production, email OTP refuses with 503 until a provider is set; Resend needs no extra package.
- Some public JSON routes have no body-size cap; several older routes still lack a same-origin check (NextAuth's `SameSite=Lax` cookie limits cross-site requests meanwhile).

## 6. Known issues and backlog

- **Remote (production) database not migrated.** Needs backup, then `npm run db:push` (adds `disabledAt` and earlier event/RSVP changes) and `npm run db:seed`. Checklist: `docs/DATABASE_SETUP.md`. Deploying before that breaks sign-in.
- Admin pages are only partly responsive on phones (users page is responsive; others are not yet).
- 403 page says "Administrators Only" even on `/gate`, which moderators may use.
- Gate scanner has no camera; `Permissions-Policy: camera=()` in `next.config.ts` would block one.
- Changing an event's membership flag while joins are pending leaves them unapprovable.
- Rejected applicants' photos and proofs are kept indefinitely.
- `sitemap.ts` is generated at build time; `docs/PRODUCTION_DEPLOYMENT.md` is partly outdated.
- `sshs_dev` contains test accounts and test events from earlier sessions.
- Mock areas in section 4 need real storage before launch.

## 7. Before going live

1. Merge `feat/sms-otp-registration` after review.
2. Back up and migrate the production database (section 6).
3. Production env: own `NEXTAUTH_SECRET`; `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (verified sending domain); `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`; BulkSMSBD key and sender ID; `OTP_BRAND_NAME` matching the approved OTP template; `NEXT_PUBLIC_BANGLA_QR_IMAGE` and `NEXT_PUBLIC_BANGLA_QR_MERCHANT` with the bank-issued QR.
4. Send one real OTP and one small broadcast to a committee phone to confirm the gateway accepts the template and sender ID.
5. Decide which mock areas (news, gallery, careers, mentorship) launch hidden or get wired to the database first.

## 8. Recent work (this branch)

- SMS OTP verification during joining (BulkSMSBD), with email OTP as the fallback; shared code core in `lib/otp.ts`.
- BulkSMSBD client and admin bulk SMS page.
- User management and the env-defined super admin; `User.disabledAt`.
- Seed: one account per role.
- Single `.env.local`; scripts load it through `lib/load-env.ts`.
- Bangla QR payment option.
- Security fixes in section 5.
- Dev fix: a leftover PWA service worker served old JavaScript in `next dev` (hydration mismatch); dev now removes it.
