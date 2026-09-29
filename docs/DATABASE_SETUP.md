
# MySQL / MariaDB Database Guide

**SSGHS Alumni Association**
(Sabuj Shikshayatan Government High School, Chattogram)

This guide explains how to configure, create, seed, and inspect the **SSGHS Alumni Association** database.

---

## 🐬 1. Overview

The platform uses **MySQL / MariaDB** via **Prisma ORM 7** (`provider = "mysql"`).

- `prisma/schema.prisma` is the single source of truth for tables and column types.
- `prisma.config.ts` gives the Prisma CLI its connection string (`DATABASE_URL`).
- `lib/prisma.ts` builds the runtime client with the `@prisma/adapter-mariadb` driver adapter from the same `DATABASE_URL`.

---

## 🛠️ 2. Prerequisites

1. A **MySQL 8+** or **MariaDB 10.6+** server — local, or a hosted database (for example a cPanel MySQL database).
2. A database user with `CREATE`, `ALTER`, `INDEX`, `REFERENCES`, `SELECT`, `INSERT`, `UPDATE`, and `DELETE` privileges on the database.
3. Optional GUI: MySQL Workbench, HeidiSQL, DBeaver, or phpMyAdmin.

---

## 🔌 3. Connection String

Set `DATABASE_URL` in `.env` in the project root (never commit this file):

```env
DATABASE_URL="mysql://<user>:<password>@<host>:3306/<database>"
```

URL-encode special characters in the password — for example `#` becomes `%23` and `@` becomes `%40`.

At runtime, query parameters are passed to the MariaDB driver as pool options, using the driver's option names — for example `?ssl=true&connectionLimit=5&connectTimeout=10000`. The Prisma CLI (`db push`) reads the same URL, so check that any option you add is also accepted there.

The URL must use `mysql://` or `mariadb://`; any other scheme is rejected at startup with a `Database not ready` error.

If `DATABASE_URL` is missing, the app still builds, but every database call throws `Database not ready: DATABASE_URL is not set.`

---

## 🌱 4. Creating Tables and Seeding

```bash
# Generate the Prisma client
npm run db:generate

# Create or update tables to match prisma/schema.prisma
npm run db:push

# Seed demo users, batches 1985–2025, events, campaigns, announcements, news, and posts
npm run db:seed
```

The seed reads its two accounts from `.env`. Passwords are required (each at least 12 characters; there are no defaults). Emails are optional and default to the addresses shown; they are stored lowercased.

```env
SEED_ADMIN_EMAIL="admin@sabujsghs.edu.bd"
SEED_ADMIN_PASSWORD="<a long random password>"
SEED_ALUMNI_EMAIL="jashedul@example.com"
SEED_ALUMNI_PASSWORD="<another long random password>"
```

It creates the admin and the verified demo alumnus with those details. If an account already exists and still has its old default password from earlier seeds (`admin123` / `password123`), the seed replaces it; a password that was changed since is left alone. This also covers the old addresses above when you configure different emails, so an earlier seed's account cannot keep a published password.

The seed is idempotent: users, batches, events and campaigns are upserted by their unique keys, and announcements, news and posts are only created when no row with the same title (or author and content) exists — including rows written by the old `scripts/seed.js`.

> ⚠️ `db:push` alters existing tables to match the schema. Back up a live database before running it against production.

**Upgrading a database created by the old `scripts/migrate.js`:** those tables carry legacy duplicate columns (`Event.bannerUrl`/`totalSeats`/`confirmedSeats`, `DonationCampaign.imageUrl`/`targetAmount`). `npm run db:push` first runs `db:backfill-legacy`, which copies their values into `bannerImage`/`maxAttendees`/`attendeesCount`/`goalAmount`. Prisma will then refuse to drop the non-empty legacy columns; once the backfill output looks right, finish with:

```bash
npx prisma db push --accept-data-loss
```

---

## 📂 5. Tables

| Table | Description | Key Columns |
| :--- | :--- | :--- |
| **`User`** | Accounts and authentication credentials. | `email`, `role` (`SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `ALUMNI`), `status` |
| **`AlumniProfile`** | Biographical and school data for each alumnus. | `fullName`, `sscBatch`, `rollNumber`, `profession`, `company`, `locationCity`, `skills` (JSON) |
| **`Batch`** | SSC batches from 1985 to 2025. | `year`, `name`, `totalMembers`, `reunionCount`, `classRepresentative` |
| **`Event`** / **`EventRegistration`** | Reunions, tournaments, webinars, and RSVPs. | `slug`, `title`, `category`, `date`, `maxAttendees`, `attendeesCount`, `registrationFee` |
| **`Post`** / **`Comment`** | Community feed posts and comments. | `authorId`, `content`, `images` (JSON), `likesCount`, `batchTag` |
| **`DonationCampaign`** | Fundraising projects. | `slug`, `title`, `goalAmount`, `raisedAmount`, `donorCount` |
| **`Donation`** / **`PaymentTransaction`** | Donation ledger and gateway transactions. | `campaignId`, `amount`, `paymentGateway`, `paymentStatus` |
| **`NewsArticle`**, **`AlumniStory`**, **`Achievement`** | Editorial content. | `title`, `category`, `publishedAt` |
| **`GalleryAlbum`** / **`GalleryPhoto`** | Photo albums. | `title`, `category`, `coverUrl` (album); `imageUrl`, `caption` (photo) |
| **`Message`** / **`Notification`** / **`Announcement`** | Messaging and alerts. | `senderId`, `receiverId`, `isRead`, `priority` |
| **`VerificationRequest`** | Admin queue for verifying graduation records. | `userId`, `sscBatch`, `proofDocumentUrl`, `status` |

JSON columns (`skills`, `images`) get their `[]` default from the Prisma client, not from the database. Raw SQL inserts must supply a value.

---

## Events & membership registration (Oct 2026)

`npm run db:push` adds event content (packages, agenda, fees, payment instructions, membership flag) and registration details; nothing is dropped. `npm run db:seed` then adds the site's 5 events, with the Golden Jubilee as the **membership event**.

Joining the association is the Jubilee registration. It stays closed ("Payment details coming soon") until an admin enters the Jubilee's **payment instructions** (bKash/Nagad number) in Admin → Events → Golden Jubilee → Pricing.

---

## Local development

`.env.local` (git-ignored) points the app at a local MySQL database — for example `sshs_dev` — and also holds `TEST_DATABASE_URL`, the connection string for a `*_test` database on `localhost` that `npm test` drops and recreates from `prisma/schema.prisma` on every run. Next.js reads `.env.local` over `.env` automatically, so the running app just needs `DATABASE_URL` in `.env.local`.

The Prisma CLI and `prisma/seed.ts` only load `.env` (`dotenv/config`), which holds the **remote** production `DATABASE_URL`. To push the schema or seed a local database, override `DATABASE_URL` on the command line — dotenv never overrides a variable that is already set:

```bash
DATABASE_URL="$(node -e 'require("dotenv").config({path:".env.local",quiet:true});process.stdout.write(process.env.DATABASE_URL)')" npx prisma db push
DATABASE_URL="$(node -e 'require("dotenv").config({path:".env.local",quiet:true});process.stdout.write(process.env.DATABASE_URL)')" npm run db:seed
```

This reads the URL out of `.env.local` without ever printing it. Local MySQL 8 needs `?allowPublicKeyRetrieval=true` appended to the local `DATABASE_URL` in `.env.local` (`caching_sha2_password` over a non-TLS local connection). Without it the app fails with `pool timeout ... active=0 idle=0` (Prisma error P2039).

**Never run `db:push` / `db:seed` without an explicit `DATABASE_URL` override** — without one, both fall back to the remote URL in `.env`.

> ⚠️ `db:push` adds unique constraints on `EventRegistration` (`[eventId, userId]`, `transactionId`). If a database already has duplicate `(eventId, userId)` registrations or duplicate transaction IDs, `db:push` will fail. Check for duplicates before pushing to the remote database, and back it up first:
>
> ```sql
> SELECT eventId, userId, COUNT(*) FROM EventRegistration GROUP BY eventId, userId HAVING COUNT(*) > 1;
> SELECT transactionId, COUNT(*) FROM EventRegistration WHERE transactionId IS NOT NULL GROUP BY transactionId HAVING COUNT(*) > 1;
> ```
