# প্রাক্তন সবুজিয়ান পরিষদ · Praktan Sabujian Parishad

The website of the alumni association of **Sabuj Shikshayatan Government High School**
(সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়), Sitakunda, Chattogram, Bangladesh: EIIN 105070,
founded 1976.

**Live site:** https://www.exsabujian.org

[![Version](https://img.shields.io/github/v/release/shauncuier/sshs-alumni_NextJS?label=version)](https://github.com/shauncuier/sshs-alumni_NextJS/releases)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma)](https://www.prisma.io/)
[![MariaDB](https://img.shields.io/badge/MariaDB-11-003545?logo=mariadb)](https://mariadb.org/)

Former students join with a photo and proof that they studied at the school, and the
committee approves each one. Members get a directory, batch pages and a digital ID card.
Events have tickets and a gate scanner. The committee runs everything from a role-based
admin panel. The site is bilingual, Bangla and English.

What changed in each version: [CHANGELOG.md](./CHANGELOG.md) and
[GitHub Releases](https://github.com/shauncuier/sshs-alumni_NextJS/releases).

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project layout](#project-layout)
- [Run it locally](#run-it-locally)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Tests](#tests)
- [Production](#production)
- [Releases and versions](#releases-and-versions)
- [Security](#security)
- [Documentation](#documentation)
- [Credits and license](#credits-and-license)

## Features

**Membership and events**
- Joining through an event registration: profile photo, proof of study, payment details
  and committee approval. A new account stays pending until it is approved.
- The mobile number is verified with an SMS code. While SMS is down, an email code works
  instead. Each number belongs to one account only.
- Manual payments by bKash, Nagad, Bangla QR, bank or cash, with a payment screenshot. A
  receipt reader (Tesseract OCR) fills in the transaction ID.
- Events with guest prices, coupons and batch-based fees. Registrations get QR tickets,
  checked in at the gate with a phone camera. Registration forms print, and so does a
  souvenir list with photos.
- Donations, verified by the committee, with emailed receipts.

**Members**
- Alumni directory, member profiles, batches, digital ID card, network, messages,
  notifications, feed, careers board and mentorship.
- Forgot password: members reset it with an SMS code sent to the number on the account.
- Women's profile photos are hidden from everyone except admins unless the member chooses
  to show them.

**Association**
- About, school history, teachers, the committee and past committees, constitution, honor
  board, notices, news, gallery, stories, achievements, sponsors, magazine submissions,
  volunteers and the Golden Jubilee page.

**Administration**
- Admin panel with roles and permissions ([lib/permissions.ts](./lib/permissions.ts)).
  It covers:
  - the verification queue, users, events, payments and donations;
  - accounts: vouchers, approvals and reports;
  - bulk SMS and content sections;
  - an activity log of every write action and sign-in.
- The admin footer shows the running version, linked to its release notes.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Lucide icons |
| Database | MariaDB / MySQL through Prisma 7 (`@prisma/adapter-mariadb`) |
| Sign-in | NextAuth 4 (credentials, JWT sessions, bcrypt) |
| Images | sharp (resizing, WebP), Tesseract.js (receipt reading) |
| Email | SMTP through Nodemailer (Resend also supported) |
| SMS | BulkSMSBD |
| Robot check | Cloudflare Turnstile |
| Analytics | Google Analytics through Cloudflare Zaraz ([lib/track.ts](./lib/track.ts)), Microsoft Clarity |
| Tests | Vitest against a real MariaDB test database |

## Project layout

```text
app/          Pages and API routes (App Router). app/admin is the admin panel, app/api the API.
components/   React components, grouped by area (admin, events, profile, shared, ...)
lib/          Server and shared logic: auth, permissions, payments, SMS, email, Turnstile, ...
prisma/       schema.prisma and the seed / maintenance scripts
scripts/      Command-line tools (env check, email and SMS tests, role QA, privacy cleanup)
tests/        Vitest suites
public/       Static files served as-is
assets/       Files read at runtime by path (fonts for share images, the email crest)
docs/         Project documentation (see below)
```

`proxy.ts` is the request proxy (Next.js 16's name for middleware). `instrumentation.ts`
runs the start-up checks.

> **This is Next.js 16.** APIs and conventions differ from older versions. Check the guides
> in `node_modules/next/dist/docs/` before changing framework-level code (see [AGENTS.md](./AGENTS.md)).

## Run it locally

Needs **Node.js 22+** and a **MariaDB or MySQL** database.

```bash
npm install
cp .env.example .env.local
```

Fill in at least `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
`NEXT_PUBLIC_APP_URL` and the `SUPER_ADMIN_*` values in `.env.local`. Then:

```bash
npm run db:push    # create or update the tables
npm run db:seed    # super admin, SSC batch years, the Golden Jubilee event (no sample members)
npm run dev        # http://localhost:3000
```

`npm run dev` listens on every network interface, so a phone on the same Wi-Fi can open
`http://<your-computer's-LAN-IP>:3000` (see `allowedDevOrigins` in
[next.config.mjs](./next.config.mjs)). For camera features on a phone, which need HTTPS,
use `npm run dev:https` (port 3443).

**Without SMS or email credentials** the site still runs. Admins can switch SMS test mode
on in Admin → Settings → SMS & verification, and the code then shows on screen instead of
being sent.

> Don't run `npm run build` while `npm run dev` is running in the same folder; the build
> overwrites `.next` and crashes the dev server.

After changing `prisma/schema.prisma`, run `npm run db:push` and restart the dev server so
it loads the new Prisma client.

## Configuration

All settings come from environment variables. Locally they live in one `.env.local`. On
the server they are set in the hosting panel or in `.env.production`. Never commit an env
file with real values. [.env.example](./.env.example) lists every variable with comments,
and [docs/PRODUCTION_ENV.md](./docs/PRODUCTION_ENV.md) explains each one for production.

| Group | Variables |
| --- | --- |
| Database | `DATABASE_URL`, `TEST_DATABASE_URL` |
| Site and sign-in | `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` |
| Super admin | `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_NAME`, `SUPER_ADMIN_SSC_BATCH` |
| Uploads | `UPLOADS_DIR` (member photos, proofs, receipts; must persist and be backed up) |
| Email | `EMAIL_PROVIDER`, `SMTP_*`, `RESEND_*`, `EMAIL_REPLY_TO`, `CONTACT_INBOX_EMAIL`, `NEXT_PUBLIC_CONTACT_EMAIL` |
| SMS | `BULKSMSBD_*`, `OTP_BRAND_NAME` |
| Robot check | `TURNSTILE_SECRET`, `TURNSTILE_SITE_KEY`, `TURNSTILE_HOSTNAMES` (off while `TURNSTILE_SECRET` is empty) |
| Payments | `NEXT_PUBLIC_BANGLA_QR_*`, `NEXT_PUBLIC_DONATION_INSTRUCTIONS`, `ONLINE_PAYMENTS_ENABLED` (gateway keys unused while off) |
| Housekeeping | `LOG_RETENTION_DAYS`, `PRIVACY_REJECTED_DAYS` |

Check an env file before using it in production:

```bash
npm run env:check -- .env.production
```

In production the server refuses to start in these cases:
- `NEXTAUTH_SECRET` is missing, or is a published example value;
- no super admin is set;
- the site address is not https.

`NEXT_PUBLIC_*` values are built into the pages, so changing one needs a rebuild.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000, reachable from the local network |
| `npm run dev:https` | Dev server over HTTPS on port 3443 (phone camera testing) |
| `npm run build` / `npm start` | Production build (webpack) and server |
| `npm run build:hostinger` | The build the host runs: Prisma client, `db:push`, production seed, then a thread-limited build |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | Vitest, once or in watch mode |
| `npm run test:db` | Starts a throwaway MariaDB 11 test database in Docker on port 3307 |
| `npm run test:admin` | Calls the admin API on the running dev server and reports each step |
| `npm run qa:roles` | Opens every page as each role against the running dev server and checks who may see it |
| `npm run db:push` | Applies `prisma/schema.prisma` to the database |
| `npm run db:seed` / `db:seed:prod` | Seeds the super admin, settings and batch years (no sample content) |
| `npm run db:super-admin` | Creates or syncs the super admin from the env file |
| `npm run db:remove-demo` | Removes sample members, posts and payments from a database |
| `npm run env:check -- <file>` | Checks an env file is fit for production |
| `npm run email:preview` | Writes every email the site sends, with sample values, to `email-previews/` |
| `npm run email:test -- <address> [email]` | Sends a test email |
| `npm run sms:test -- <phone>` | Sends a test SMS |
| `npm run privacy:cleanup` | Deletes rejected applicants' photos and proofs past the retention period |

## Tests

The suites in `tests/` run against a real MariaDB database, never the development one.

```bash
npm run test:db                                                      # once: start the test database in Docker
# in .env.local: TEST_DATABASE_URL="mysql://root:test@127.0.0.1:3307/sshs_test"
npm test
```

Run one test run at a time, because the runs share the database. Before a release, the
full suite, `npx tsc --noEmit` and `npm run lint` must all pass. Also try the changed
flow by hand on the local site with a throwaway account.

## Production

The live site runs as a **Node.js app on Hostinger**, with **Cloudflare** in front. The
host builds each deploy itself with `npm run build:hostinger`, which brings the database
schema up to date before the build.

Things to know about the server build:
- **`next.config.mjs` stays plain JavaScript, and builds use `--webpack`.** The host has
  an older glibc, which can't load the native SWC binary that a TypeScript config or
  Turbopack needs.
- **Files read by path at runtime must be listed in `outputFileTracingIncludes`** in
  `next.config.mjs`, or the deployed app won't have them. Current entries: the fonts in
  `assets/` and Tesseract's WebAssembly files.
- **`UPLOADS_DIR` must sit on a persistent, backed-up disk** outside the web root. It holds
  member photos, proof-of-study documents and payment screenshots, which are private and
  only served to admins through the API. Serverless hosts such as Vercel are not supported.
- **Cloudflare passes on the real visitor address** in `CF-Connecting-IP`
  ([lib/client-ip.ts](./lib/client-ip.ts)). Rate limits and the robot check depend on it.

[docs/PRODUCTION_DEPLOYMENT.md](./docs/PRODUCTION_DEPLOYMENT.md) covers deployment
options, backups and operations in full.

## Releases and versions

Every deploy is a numbered release following [Semantic Versioning](https://semver.org/):
- a fix raises the last number (1.1.**1**);
- a new feature raises the middle one (1.**2**.0);
- a change that breaks existing use raises the first (**2**.0.0).

The routine is in [docs/RELEASING.md](./docs/RELEASING.md):

1. While working, add each change under `## [Unreleased]` in [CHANGELOG.md](./CHANGELOG.md).
2. Run the tests, then try the changed flow on the local site.
3. Bump the version with `npm version X.Y.Z --no-git-tag-version`, and move the
   Unreleased notes to `## [X.Y.Z] - <date>`.
4. Commit as `chore(release): vX.Y.Z`, tag `vX.Y.Z`, and push with `--follow-tags`.
5. Deploy that tag, check the live site, then publish the GitHub Release from the
   changelog section.

The version in `package.json` is built into the site and shown in the admin panel footer.

## Security

Measures in place:
- strict security headers (CSP, HSTS, frame and permissions policies);
- same-origin checks on every write request;
- rate limits;
- sealed QR tokens on tickets and member cards;
- private storage for proofs, receipts and vouchers;
- the Cloudflare Turnstile robot check on every public form.

A password reset or a password change signs the account out everywhere.

This repository is public. Never commit secrets, env files, database dumps or member data.
To report a security problem, email the association at info@exsabujian.org rather than
opening a public issue.

## Documentation

| Document | About |
| --- | --- |
| [CHANGELOG.md](./CHANGELOG.md) | What changed in each version |
| [docs/RELEASING.md](./docs/RELEASING.md) | How to cut and deploy a release |
| [docs/PRODUCTION_ENV.md](./docs/PRODUCTION_ENV.md) | Every production setting |
| [docs/PRODUCTION_DEPLOYMENT.md](./docs/PRODUCTION_DEPLOYMENT.md) | Deployment, backups, operations |
| [docs/PRODUCTION_ROADMAP.md](./docs/PRODUCTION_ROADMAP.md) | The go-live plan and its status |
| [docs/PROJECT_STATUS.md](./docs/PROJECT_STATUS.md) | Current project status |
| [docs/DATABASE_SETUP.md](./docs/DATABASE_SETUP.md) | Database setup |
| [docs/DATA_RETENTION.md](./docs/DATA_RETENTION.md) | What personal data is kept and for how long |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | How the parts fit together |
| [docs/API_SPECIFICATION.md](./docs/API_SPECIFICATION.md) | API routes |
| [docs/QA_CHECKLIST.md](./docs/QA_CHECKLIST.md), [docs/PHONE_TEST_CHECKLIST.md](./docs/PHONE_TEST_CHECKLIST.md) | Manual test checklists |
| [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) | How to contribute |
| [docs/constitution/](./docs/constitution/) | The association's constitution |

## Credits and license

Built for **প্রাক্তন সবুজিয়ান পরিষদ (Praktan Sabujian Parishad)** by
**[3s-Soft](https://3s-soft.com)**. School website: https://sabujsghs.edu.bd/.

© 2026 3s-Soft. All rights reserved. This code is public to view but is **not open
source**: copying, reusing or deploying it needs written permission from 3s-Soft. See
[LICENSE](./LICENSE).
