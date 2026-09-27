
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

The seed is idempotent: every record is written with `upsert`, so re-running it does not create duplicates.

> ⚠️ `db:push` alters existing tables to match the schema. Back up a live database before running it against production.

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
| **`GalleryAlbum`** / **`GalleryPhoto`** | Photo albums. | `title`, `category`, `imageUrl`, `caption` |
| **`Message`** / **`Notification`** / **`Announcement`** | Messaging and alerts. | `senderId`, `receiverId`, `isRead`, `priority` |
| **`VerificationRequest`** | Admin queue for verifying graduation records. | `userId`, `sscBatch`, `proofDocumentUrl`, `status` |

JSON columns (`skills`, `images`) get their `[]` default from the Prisma client, not from the database. Raw SQL inserts must supply a value.
