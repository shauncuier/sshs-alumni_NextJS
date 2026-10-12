# Production environment

The production server reads its settings from an env file on the server (for example `/var/www/ssghs/.env.production`). That file is never committed: `.gitignore` excludes every `.env*` file except `.env.example`.

**Before every deploy:**

```bash
npm run env:check -- /path/to/.env.production
```

It prints variable names only, never values, and exits with an error when the site would refuse to start. In production (`NODE_ENV=production`) the server itself runs the same check at start-up (`instrumentation.ts`, `lib/env-check.ts`): with an error it **refuses to start**, and it prints the warnings in the log. A production build started on your own machine with a `localhost` address only prints the messages.

## Required (the site will not start without them)

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Production MySQL/MariaDB URL. Its own database user and password, not root. |
| `NEXTAUTH_SECRET` | New random value for production only: `openssl rand -base64 32`. Never reuse the local one, never the old example value. Changing it signs everyone out and invalidates issued member cards and tickets, so set it once. |
| `NEXTAUTH_URL` | The site's `https://` address, e.g. `https://alumni.example.org`. |
| `NEXT_PUBLIC_APP_URL` | Same address as `NEXTAUTH_URL`. Must be set **before `npm run build`** (it is built into the pages). |
| `SUPER_ADMIN_EMAIL` | The committee's super admin login. |
| `SUPER_ADMIN_PASSWORD` | 12+ characters, kept in a password manager. Changing it and restarting resets the password and signs the super admin out everywhere. |
| `ONLINE_PAYMENTS_ENABLED` | `"false"` (manual payment only, roadmap step 5). |

## Needed for features (warnings until set)

| Variable | Feature | Roadmap |
| --- | --- | --- |
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (or `SMTP_*`) | Email codes, receipts, job and mentorship emails. The sender must be on a domain verified in Resend; `onboarding@resend.dev` or a Gmail address only reaches the Resend account owner | 17 |
| `EMAIL_REPLY_TO`, `NEXT_PUBLIC_CONTACT_EMAIL` | Association mailbox for replies and the site's contact address (`sabujshikshayatanalumni@gmail.com`) | 17 |
| `BULKSMSBD_API_KEY`, `BULKSMSBD_SENDER_ID`, `OTP_BRAND_NAME` | SMS codes and broadcasts | 18 |
| — | bKash / Nagad numbers, bank account and the Bangla QR image are **not** env variables any more: an admin sets them in **Admin → Payment settings** (each method switched on or off) (the old `NEXT_PUBLIC_BANGLA_QR_*` and `NEXT_PUBLIC_DONATION_INSTRUCTIONS` are only a fallback until then) | 19 |
| `CONTACT_INBOX_EMAIL` | Contact-form messages by email | 17 |
| `UPLOADS_DIR` | Absolute path outside the app folder (e.g. `/var/lib/ssghs/uploads`), included in backups | 28, 30 |
| `LOG_RETENTION_DAYS` | Activity log retention, default 365 | — |
| `PRIVACY_REJECTED_DAYS` | Days before rejected applicants' photos and payment screenshots are deleted, default 30 ([DATA_RETENTION.md](DATA_RETENTION.md)) | 15 |
| `NEXT_PUBLIC_SCHOOL_*` | School name and details shown on the site | — |

## Must not be in production

- `SEED_ADMIN_PASSWORD`, `SEED_MODERATOR_PASSWORD`, `SEED_ALUMNI_PASSWORD` and the `SEED_*_EMAIL` lines: test accounts are for local development. Production uses `npm run db:seed:prod`, which creates none.
- `TEST_DATABASE_URL`.
- Payment gateway keys (`BKASH_*`, `NAGAD_*`, `SSLCOMMERZ_*`) while online payments are off.

## Secrets already exposed

- The old example `NEXTAUTH_SECRET` was published in `.env.example`. The production check rejects it. Replace it locally too.
- An old local seed admin password appears in the git history of the admin test suite. Do not use it anywhere; change it in `.env.local`. On any database where it was used, change the password or disable the account (`npm run db:seed:prod` lists active test accounts).
