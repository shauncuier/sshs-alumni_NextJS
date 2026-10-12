# SSGHS Alumni Association
### Sabuj Shikshayatan Government High School, Sitakunda, Chattogram

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![MariaDB](https://img.shields.io/badge/MySQL-MariaDB-4479a1?style=flat&logo=mysql)](https://mariadb.org/)

The website of the **SSGHS Alumni Association** (Sabuj Shikshayatan Government High School / সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়, EIIN 105070, founded 1976): membership with committee verification, member directory, batches, events with tickets and a gate scanner, news, gallery, stories, jobs, mentorship, donations with manual payment, and an admin panel per role.

School website: [https://sabujsghs.edu.bd/](https://sabujsghs.edu.bd/)

---

## Quick start (local)

Needs Node 22+ and a MariaDB/MySQL database.

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL, NEXTAUTH_SECRET, SUPER_ADMIN_*, SEED_*_PASSWORD
npm run db:push              # create the tables
npm run db:seed              # local accounts per role and sample data (never in production)
npm run dev                  # http://localhost:3000
```

All settings live in one `.env.local` (development) or `.env.production` (server). See [docs/PRODUCTION_ENV.md](./docs/PRODUCTION_ENV.md) for every variable.

## Useful scripts

| Script | What it does |
| --- | --- |
| `npm test` | Vitest against the test database (`TEST_DATABASE_URL`; `npm run test:db` starts one in Docker). Run one test run at a time: they share the database. |
| `npm run lint` | ESLint |
| `npm run qa:roles` | Opens every page as each role against the running dev server and checks who may see it |
| `npm run env:check -- <file>` | Checks an env file is fit for production |
| `npm run db:seed:prod` | Production seed: super admin and settings only, no sample content |
| `npm run db:remove-demo` | Removes sample members, posts and payments from a database |
| `npm run db:super-admin` | Creates or syncs the super admin from the env file |
| `npm run email:test -- <address>` / `npm run sms:test -- <phone>` | Sends a test email / SMS |
| `npm run privacy:cleanup` | Deletes rejected applicants' photos and proofs past the retention period |

Do not run `npm run build` while `npm run dev` is running on the same folder.

## Documentation

- [Production roadmap](./docs/PRODUCTION_ROADMAP.md): the go-live plan and its status
- [Project status](./docs/PROJECT_STATUS.md)
- [Production deployment](./docs/PRODUCTION_DEPLOYMENT.md) and [production environment](./docs/PRODUCTION_ENV.md)
- [Database setup](./docs/DATABASE_SETUP.md)
- [Data retention](./docs/DATA_RETENTION.md)
- [QA checklist](./docs/QA_CHECKLIST.md) and [phone test checklist](./docs/PHONE_TEST_CHECKLIST.md)
- [Architecture](./docs/ARCHITECTURE.md), [API](./docs/API_SPECIFICATION.md), [Contributing](./docs/CONTRIBUTING.md)

---

Developed for the **SSGHS Alumni Association** by **[3s-Soft](https://3s-soft.com)**. All rights reserved © 2026.
