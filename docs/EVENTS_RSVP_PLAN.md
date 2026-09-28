# Events & RSVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store events and registrations in the database, make joining the association the paid Golden Jubilee registration (one combined form, one admin approval), and give each confirmed registration a gate ticket.

**Architecture:** Business rules live in small server modules under `lib/events/` (pricing, availability, registration, admin decisions, tickets) that take plain inputs and a Prisma client, so they are tested directly against a throwaway MariaDB with Vitest. API routes are thin wrappers that read the session and call these modules. Pages keep their existing layouts and swap their data source from sample data / `localStorage` to the APIs.

**Tech Stack:** Next.js 16.3 (App Router, `proxy.ts`), React 19, Prisma 7 with `@prisma/adapter-mariadb`, MariaDB/MySQL, NextAuth v4 (credentials, JWT), Vitest (added in Task 1), Docker for the test database.

**Spec:** `docs/EVENTS_RSVP_DESIGN.md` (read it first; §10 lists amendments made while writing this plan).

## Global Constraints

- Joining the association is only possible through the paid **membership event** (`isMembershipEvent`); there is no free sign-up. `POST /api/auth/register` returns **410**.
- A membership registration fee must be above 0; the optional donation never counts towards it.
- Fees are **computed on the server**; any fee sent by the browser is ignored.
- Pricing (the "Jubilee model"): `fee = package.price + (package.guestsFree ? 0 : extraAdults × event.extraAdultFee + extraChildren × event.childFee)`; events without packages use `registrationFee` as the base. `total = fee + donationAmount`.
- Head count = `package.adults + package.children + extraAdults + extraChildren` (1 + extras when the event has no packages).
- Capacity counts `PENDING_PAYMENT` + `CONFIRMED` + `CHECKED_IN` head counts; the live attendee count shown publicly counts `CONFIRMED` + `CHECKED_IN`.
- One registration per member per event (`@@unique([eventId, userId])`); a transaction ID can be used once (`@unique`).
- Approving a membership registration also verifies the member (user, profile, pending verification request) in the same database transaction; rejecting it rejects a member who is still `PENDING`, never an already-verified member.
- Identity always comes from the session (`lib/session-user.ts`); never from a `userId` in a request.
- Gate check-in is allowed for `ADMIN`, `SUPER_ADMIN` and `MODERATOR`; everything else under `/api/admin` is `ADMIN`/`SUPER_ADMIN`.
- Ticket QR text is `SSGHS-TICKET:<token>`; tickets and alumni cards use different encryption purposes, so one can never be read as the other.
- Never report "registered", "confirmed" or "verified" unless it was stored.
- Commit messages carry **no** Claude attribution lines (`CLAUDE.md`).
- All Markdown documentation lives in `docs/`.

## Review Focus

1. **A visitor whose email already has an account** submits the combined form — expected: 409 "You already have an account — sign in to register", and **no** registration attached to that existing account. (Test in Task 7.)
2. **Two visitors take the last places at the same time** — expected: exactly one succeeds; capacity is never exceeded. (Test in Task 7, concurrent `Promise.all`.)
3. **An admin rejects the membership registration of a member who was already verified before this change** — expected: the registration is cancelled but the member stays `VERIFIED`. (Test in Task 8.)
4. **A transaction ID typed with different case or spaces** (" 9ab3xk1 " vs "9AB3XK1") — expected: treated as the same ID and refused the second time. (Test in Task 7.)
5. **A registration made before an admin changes the package price** — expected: its stored `totalFee` does not change. (Test in Task 6.)

---

## File Structure

**Create**
- `vitest.config.ts` — test runner config (Node env, `@` alias, serial files, test DB env).
- `tests/setup/global-setup.ts` — recreates the test database from `prisma/schema.prisma` before a run.
- `tests/helpers/db.ts` — `resetDatabase()` and factories `makeMember()`, `makeEvent()`.
- `lib/app-error.ts` — `AppError` (code, HTTP status, message); safe to import in the browser.
- `lib/api-response.ts` — `errorResponse()` for routes.
- `lib/sealed-token.ts` — AES-256-GCM `sealJson` / `openJson`, shared by cards and tickets.
- `lib/events/types.ts` — shared types for packages, inputs, public events and registrations.
- `lib/events/pricing.ts` — `parseTaka`, `formatTaka`, `normalizePackages`, `computeFee`, `isPaidEvent`.
- `lib/events/availability.ts` — `registrationClosedReason` and messages.
- `lib/events/service.ts` — event reads (public shape, live counts) and admin writes.
- `lib/members/create-member.ts` — `createMemberAccount()` (shared by the combined form; extracted from the old register route).
- `lib/events/registrations.ts` — `registerForEvent()`, `getMemberRegistration()`, `listMemberRegistrations()`.
- `lib/events/membership.ts` — `hasPendingMembershipPayment()`.
- `lib/events/admin.ts` — `getAdminEvent()`, `decideRegistration()`.
- `lib/events/tickets.ts` — ticket tokens, QR, `checkInTicket()`.
- `app/api/events/[slug]/route.ts`, `app/api/events/[slug]/rsvp/route.ts`, `app/api/events/membership/route.ts`, `app/api/events/verify-ticket/route.ts`, `app/api/me/registrations/route.ts`.
- `app/api/admin/events/route.ts`, `app/api/admin/events/[id]/route.ts`, `app/api/admin/events/[id]/registrations/[regId]/route.ts`.
- `components/events/RegistrationForm.tsx` — the combined account + registration form.
- `components/events/MyEvents.tsx` — dashboard card with tickets.
- Tests: `tests/**/*.test.ts` as listed per task.

**Modify**
- `package.json` (scripts, devDependencies), `prisma/schema.prisma`, `prisma/seed.ts`, `lib/id-card.ts`, `lib/data.ts` (types only), `lib/admin-verifications.ts`, `app/api/events/route.ts`, `app/api/auth/register/route.ts`, `app/api/admin/verifications/route.ts`, `app/events/page.tsx`, `app/events/[id]` → `app/events/[slug]`, `components/events/EventCard.tsx`, `components/events/RSVPModal.tsx`, `app/register/page.tsx`, `app/page.tsx`, `app/dashboard/page.tsx`, `app/sitemap.ts`, `components/shared/GlobalSearchModal.tsx`, `app/admin/events/page.tsx`, `app/admin/events/[id]/page.tsx`, `app/admin/page.tsx`, `app/admin/alumni/page.tsx`, `app/admin/gate-verify/page.tsx`, `docs/API_SPECIFICATION.md`, `docs/DATABASE_SETUP.md`.

**Delete**
- `lib/events-service.ts`, `app/api/events/[id]/` (route, `rsvp`, `ticket`), `app/events/[id]/ticket/`.

---

### Task 1: Test infrastructure (Vitest + throwaway MariaDB)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`, `tests/setup/global-setup.ts`, `tests/helpers/db.ts`, `tests/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` (runs Vitest against `TEST_DATABASE_URL`, default `mysql://root:test@127.0.0.1:3307/sshs_test`); `npm run test:db` (starts the Docker MariaDB); `resetDatabase(): Promise<void>`; `makeMember(opts?: { status?: "PENDING"|"VERIFIED"|"REJECTED"; role?: "ALUMNI"|"ADMIN"|"MODERATOR"; email?: string }): Promise<{ id: string; email: string }>`; `makeEvent(data?: Partial<Prisma.EventUncheckedCreateInput>): Promise<Event>`.

- [ ] **Step 1: Install Vitest and the MariaDB driver as dev dependencies**

Run: `npm install --save-dev vitest@^3 mariadb@^3`
Expected: both appear under `devDependencies`.

- [ ] **Step 2: Add scripts to `package.json`**

In `"scripts"` add:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:db": "docker run -d --rm --name sshs-test-db -e MARIADB_ROOT_PASSWORD=test -p 127.0.0.1:3307:3306 mariadb:11"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "mysql://root:test@127.0.0.1:3307/sshs_test";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/setup/global-setup.ts"],
    // One shared database: run test files one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      TEST_DATABASE_URL,
      NEXTAUTH_SECRET: "test-secret-for-vitest-0123456789abcdef",
    },
  },
});
```

- [ ] **Step 4: Create `tests/setup/global-setup.ts`**

```ts
import { execSync } from "node:child_process";
import mariadb from "mariadb";

// Recreates the test database from prisma/schema.prisma before every test run.
// Refuses to touch anything that is not a local test database.
export default async function globalSetup() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "mysql://root:test@127.0.0.1:3307/sshs_test");
  const database = url.pathname.replace(/^\//, "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || !database.endsWith("_test")) {
    throw new Error(`Refusing to reset ${url.hostname}/${database}: tests only run against a local *_test database.`);
  }

  const sql = execSync("npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script", {
    encoding: "utf8",
  });

  const conn = await mariadb.createConnection({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    multipleStatements: true,
  });
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await conn.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${database}\``);
    await conn.query(sql);
  } finally {
    await conn.end();
  }
}
```

- [ ] **Step 5: Create `tests/helpers/db.ts`**

```ts
import bcrypt from "bcryptjs";
import type { Event, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<{ t: string }[]>`
    SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`;
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  for (const { t } of tables) await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``);
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
}

let counter = 0;

export async function makeMember(
  opts: { status?: "PENDING" | "VERIFIED" | "REJECTED"; role?: "ALUMNI" | "ADMIN" | "MODERATOR"; email?: string } = {}
): Promise<{ id: string; email: string }> {
  counter += 1;
  const status = opts.status ?? "VERIFIED";
  const user = await prisma.user.create({
    data: {
      email: opts.email ?? `member${counter}@example.test`,
      passwordHash: await bcrypt.hash("Member-Pw-1234", 4),
      role: opts.role ?? "ALUMNI",
      status,
      profile: {
        create: {
          fullName: `Member ${counter}`,
          sscBatch: 2000,
          graduationYear: 2000,
          profession: "Engineer",
          locationCity: "Chattogram",
          locationCountry: "Bangladesh",
          verificationStatus: status,
        },
      },
    },
  });
  return { id: user.id, email: user.email };
}

export async function makeEvent(data: Partial<Prisma.EventUncheckedCreateInput> = {}): Promise<Event> {
  counter += 1;
  return prisma.event.create({
    data: {
      slug: `event-${counter}`,
      title: `Event ${counter}`,
      description: "Test event",
      date: new Date("2030-01-01T09:00:00+06:00"),
      venue: "School Auditorium",
      maxAttendees: 100,
      ...data,
    },
  });
}
```

- [ ] **Step 6: Write a smoke test `tests/smoke.test.ts`**

```ts
import { beforeEach, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

beforeEach(resetDatabase);

it("talks to the throwaway test database", async () => {
  await makeMember();
  expect(await prisma.user.count()).toBe(1);
});
```

- [ ] **Step 7: Start the test database and run the tests**

Run: `npm run test:db` (once; wait ~10 s for MariaDB to start), then `npm test`
Expected: 1 passed.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests
git commit -m "test: add Vitest with a throwaway MariaDB test database"
```

---

### Task 2: Schema — event content, registrations, statuses

**Files:**
- Modify: `prisma/schema.prisma` (`Event`, `EventRegistration`, new enum)
- Test: `tests/events/schema.test.ts`

**Interfaces:**
- Produces (Prisma client): `Event.subtitle`, `guestOfHonor`, `souvenirDetails`, `registrationDeadline`, `isMegaEvent`, `isMembershipEvent`, `agenda` (Json), `highlights` (Json), `packages` (Json), `extraAdultFee`, `childFee`, `paymentInstructions`; `EventRegistration.packageName`, `extraAdults`, `extraChildren`, `headCount`, `tshirtSize`, `totalFee`, `donationAmount`, `paymentMethod`, `transactionId` (unique), `status: RegistrationStatus`, `confirmedBy`, `confirmedAt`, `checkedInAt`, `updatedAt`; enum `RegistrationStatus { PENDING_PAYMENT CONFIRMED CHECKED_IN CANCELLED }`.

- [ ] **Step 1: Write the failing test `tests/events/schema.test.ts`**

```ts
import { beforeEach, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

beforeEach(resetDatabase);

it("stores rich event content and registration details", async () => {
  const event = await makeEvent({
    isMembershipEvent: true,
    packages: [{ name: "General", price: 1000, adults: 1, children: 0 }],
    agenda: [{ time: "Day 1 - 09:00 AM", activity: "Opening" }],
    extraAdultFee: 500,
    childFee: 300,
  });
  const member = await makeMember();
  const reg = await prisma.eventRegistration.create({
    data: {
      eventId: event.id,
      userId: member.id,
      packageName: "General",
      headCount: 1,
      totalFee: 1000,
      donationAmount: 200,
      paymentMethod: "bKash",
      transactionId: "TRX12345",
      status: "PENDING_PAYMENT",
    },
  });
  expect(reg.status).toBe("PENDING_PAYMENT");
  expect((await prisma.event.findUniqueOrThrow({ where: { id: event.id } })).isMembershipEvent).toBe(true);
});

it("allows one registration per member per event", async () => {
  const event = await makeEvent();
  const member = await makeMember();
  await prisma.eventRegistration.create({ data: { eventId: event.id, userId: member.id } });
  await expect(prisma.eventRegistration.create({ data: { eventId: event.id, userId: member.id } })).rejects.toThrow();
});

it("allows a transaction ID only once", async () => {
  const event = await makeEvent();
  const [a, b] = [await makeMember(), await makeMember()];
  await prisma.eventRegistration.create({ data: { eventId: event.id, userId: a.id, transactionId: "SAME1" } });
  await expect(
    prisma.eventRegistration.create({ data: { eventId: event.id, userId: b.id, transactionId: "SAME1" } })
  ).rejects.toThrow();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- tests/events/schema.test.ts`
Expected: FAIL (TypeScript/Prisma: unknown fields `isMembershipEvent`, `packages`, …).

- [ ] **Step 3: Update `prisma/schema.prisma`**

Add the enum next to `EventCategory`:

```prisma
enum RegistrationStatus {
  PENDING_PAYMENT
  CONFIRMED
  CHECKED_IN
  CANCELLED
}
```

In `model Event`, after `isRegistrationOpen`, add:

```prisma
  subtitle             String?
  guestOfHonor         String?
  souvenirDetails      String?   @db.Text
  registrationDeadline DateTime?
  isMegaEvent          Boolean   @default(false)
  isMembershipEvent    Boolean   @default(false)
  agenda               Json      @default("[]")
  highlights           Json      @default("[]")
  packages             Json      @default("[]")
  extraAdultFee        Float     @default(0)
  childFee             Float     @default(0)
  paymentInstructions  String?   @db.Text
```

Replace `model EventRegistration` with:

```prisma
model EventRegistration {
  id             String             @id @default(uuid()) @db.VarChar(36)
  eventId        String             @db.VarChar(36)
  event          Event              @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId         String             @db.VarChar(36)
  user           User               @relation(fields: [userId], references: [id])
  guestCount     Int                @default(1)
  mealPreference String?
  notes          String?            @db.Text
  packageName    String?
  extraAdults    Int                @default(0)
  extraChildren  Int                @default(0)
  headCount      Int                @default(1)
  tshirtSize     String?
  totalFee       Float              @default(0)
  donationAmount Float              @default(0)
  paymentMethod  String?
  transactionId  String?            @unique
  status         RegistrationStatus @default(PENDING_PAYMENT)
  confirmedBy    String?
  confirmedAt    DateTime?
  checkedInAt    DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([eventId, userId])
}
```

Run: `npx prisma format && npx prisma validate && npx prisma generate`
Expected: "The schema … is valid".

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- tests/events/schema.test.ts`
Expected: 3 passed (global setup rebuilds the test DB from the new schema).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma tests/events/schema.test.ts
git commit -m "feat(db): add event content, registration details and statuses"
```

---

### Task 3: Shared sealed tokens (cards + tickets)

**Files:**
- Create: `lib/sealed-token.ts`, `lib/app-error.ts`, `lib/api-response.ts`
- Modify: `lib/id-card.ts:26-118`
- Test: `tests/sealed-token.test.ts`, `tests/id-card.test.ts`

**Interfaces:**
- Produces: `sealJson(purpose: string, value: unknown): string`; `openJson<T>(purpose: string, token: string): { ok: true; value: T } | { ok: false; reason: "malformed" | "forged" }`; `class AppError extends Error { code: string; status: number }` (`lib/app-error.ts`); `errorResponse(err: unknown, context: string): NextResponse` (`lib/api-response.ts`).
- `createCardToken` / `verifyCardToken` keep their signatures and messages; existing card tokens stay valid (same purpose string `ssghs-alumni-card-token-v2`).

- [ ] **Step 1: Write the failing tests**

`tests/sealed-token.test.ts`:

```ts
import { expect, it } from "vitest";
import { openJson, sealJson } from "@/lib/sealed-token";

it("round-trips a value", () => {
  const token = sealJson("purpose-a", { id: "r1" });
  expect(openJson<{ id: string }>("purpose-a", token)).toEqual({ ok: true, value: { id: "r1" } });
});

it("cannot be opened for another purpose", () => {
  const token = sealJson("purpose-a", { id: "r1" });
  expect(openJson("purpose-b", token)).toEqual({ ok: false, reason: "forged" });
});

it("rejects altered and truncated tokens", () => {
  const token = sealJson("purpose-a", { id: "r1" });
  const bytes = Buffer.from(token, "base64url");
  bytes[20] ^= 1;
  expect(openJson("purpose-a", bytes.toString("base64url"))).toEqual({ ok: false, reason: "forged" });
  expect(openJson("purpose-a", token.slice(0, 20))).toEqual({ ok: false, reason: "malformed" });
});
```

`tests/id-card.test.ts`:

```ts
import { expect, it } from "vitest";
import { createCardToken, verifyCardToken } from "@/lib/id-card";

const payload = { alumniId: "SSGHS-ALM-2008-ABC123", fullName: "Test", sscBatch: 2008, membershipTier: "LIFETIME" as const, issuedAt: Date.now() };

it("still issues and verifies card tokens", () => {
  expect(verifyCardToken(createCardToken(payload))).toMatchObject({ valid: true, payload: { fullName: "Test", eiin: "105070" } });
});

it("reports forged and outdated cards as before", () => {
  expect(verifyCardToken("x".repeat(60)).error).toMatch(/forged/);
  expect(verifyCardToken("abc.def").error).toMatch(/outdated QR format/);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test -- tests/sealed-token.test.ts tests/id-card.test.ts`
Expected: FAIL — `Cannot find module '@/lib/sealed-token'`.

- [ ] **Step 3: Create `lib/app-error.ts` and `lib/api-response.ts`**

`lib/app-error.ts` has no server imports, because `lib/events/pricing.ts` (which throws it) is also used by the registration form in the browser:

```ts
/** An expected failure with a user-facing message and the HTTP status to return. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}
```

`lib/api-response.ts`:

```ts
import { NextResponse } from "next/server";
import { AppError } from "@/lib/app-error";

/** Turns an AppError into its JSON response; logs anything else and returns a generic 500. */
export function errorResponse(err: unknown, context: string): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  console.error(`[${context}]`, err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
```

- [ ] **Step 4: Create `lib/sealed-token.ts`**

```ts
import crypto from "crypto";

const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

let devSecret: string | undefined;

/**
 * Production requires NEXTAUTH_SECRET: a key published in the source would let anyone
 * forge or read passes and tickets. Development falls back to a random per-process
 * secret, so issued tokens stop verifying after a restart.
 */
function secret(): string {
  const value = process.env.NEXTAUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET must be set to issue or verify alumni cards and event tickets.");
  }
  devSecret ??= crypto.randomBytes(32).toString("hex");
  return devSecret;
}

// Each purpose gets its own AES-256 key, so a card token can never be read as a ticket.
function keyFor(purpose: string): Buffer {
  return Buffer.from(crypto.hkdfSync("sha256", secret(), "", purpose, 32));
}

/** Encrypts `value` as JSON with AES-256-GCM. Token = base64url(iv | authTag | ciphertext). */
export function sealJson(purpose: string, value: unknown): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFor(purpose), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

export type OpenResult<T> = { ok: true; value: T } | { ok: false; reason: "malformed" | "forged" };

export function openJson<T>(purpose: string, token: string): OpenResult<T> {
  // Derive the key outside the try: a missing secret is a server misconfiguration
  // and must surface as an error, not as a "forged" token.
  const key = keyFor(purpose);
  const raw = Buffer.from(token, "base64url");
  if (raw.length <= IV_BYTES + AUTH_TAG_BYTES) return { ok: false, reason: "malformed" };
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, raw.subarray(0, IV_BYTES));
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES));
    const plaintext = Buffer.concat([decipher.update(raw.subarray(IV_BYTES + AUTH_TAG_BYTES)), decipher.final()]);
    return { ok: true, value: JSON.parse(plaintext.toString("utf8")) as T };
  } catch {
    return { ok: false, reason: "forged" };
  }
}
```

- [ ] **Step 5: Refactor `lib/id-card.ts` onto it**

Replace lines 10-118 (from `import crypto` through the end of `verifyCardToken`) with:

```ts
import crypto from "crypto";
import QRCode from "qrcode";
import { openJson, sealJson } from "@/lib/sealed-token";

export interface CardPayload {
  alumniId: string;
  userId?: string;
  fullName: string;
  sscBatch: number;
  profession?: string;
  bloodGroup?: string;
  membershipTier: "LIFETIME" | "ANNUAL" | "HONORARY" | "GENERAL";
  issuedAt: number;
  expiresAt?: number;
  eiin: string; // 105070
}

// Unchanged purpose string: cards issued before this refactor stay valid.
const CARD_TOKEN_PURPOSE = "ssghs-alumni-card-token-v2";
const SCHOOL_EIIN = "105070";

/**
 * The member's SSGHS Alumni Identification Number.
 * Format: SSGHS-ALM-{BATCH}-{6 HEX}. The suffix is derived from the account id,
 * so a member keeps the same number every time their card is issued.
 */
export function generateAlumniId(batch: number | string, memberId: string): string {
  const cleanBatch = String(batch).slice(-4);
  const suffix = crypto.createHash("sha256").update(memberId).digest("hex").slice(0, 6).toUpperCase();
  return `SSGHS-ALM-${cleanBatch}-${suffix}`;
}

/** Encrypted, tamper-proof gate-verification token for a card payload. */
export function createCardToken(payload: Omit<CardPayload, "eiin">): string {
  return sealJson(CARD_TOKEN_PURPOSE, { ...payload, eiin: SCHOOL_EIIN } satisfies CardPayload);
}

/** Decrypt and verify a gate-verification token. */
export function verifyCardToken(token: string): { valid: boolean; payload?: CardPayload; error?: string } {
  // Earlier passes were readable "payload.signature" tokens. The card page issues a
  // fresh QR on every visit, so point the holder there rather than calling it forged.
  if (token.includes(".")) {
    return {
      valid: false,
      error: "This pass uses an outdated QR format. Ask the member to reopen their digital card for a new QR code.",
    };
  }
  const opened = openJson<CardPayload>(CARD_TOKEN_PURPOSE, token);
  if (!opened.ok) {
    return {
      valid: false,
      error: opened.reason === "malformed" ? "Invalid token structure" : "Cryptographic signature mismatch — pass may be forged",
    };
  }
  if (opened.value.expiresAt && Date.now() > opened.value.expiresAt) {
    return { valid: false, payload: opened.value, error: "Alumni pass has expired" };
  }
  return { valid: true, payload: opened.value };
}
```

- [ ] **Step 6: Run to verify they pass, and typecheck**

Run: `npm test -- tests/sealed-token.test.ts tests/id-card.test.ts && npx tsc --noEmit -p .`
Expected: 5 passed; no type errors.

- [ ] **Step 7: Commit**

```bash
git add lib/sealed-token.ts lib/app-error.ts lib/api-response.ts lib/id-card.ts tests/sealed-token.test.ts tests/id-card.test.ts
git commit -m "refactor: share AES-GCM token sealing between cards and tickets"
```

---

### Task 4: Pricing and availability rules

**Files:**
- Create: `lib/events/types.ts`, `lib/events/pricing.ts`, `lib/events/availability.ts`
- Test: `tests/events/pricing.test.ts`, `tests/events/availability.test.ts`

**Interfaces:**
- Produces (types in `lib/events/types.ts`):
  - `PackageDef { name: string; price: number; description: string; includes: string[]; isPopular: boolean; adults: number; children: number; guestsFree: boolean }`
  - `AgendaEntry { time: string; activity: string }`
  - `RsvpInput { packageName?: string | null; extraAdults?: number; extraChildren?: number; tshirtSize?: string | null; mealPreference?: string | null; paymentMethod?: string | null; transactionId?: string | null; donationAmount?: number; notes?: string | null }`
  - `AccountInput { fullName: string; email: string; phone?: string | null; password: string; sscBatch: number | string; rollNumber?: string | null; section?: string | null; profession?: string | null; company?: string | null; locationCity?: string | null }`
  - `PAYMENT_METHODS = ["bKash", "Nagad", "Bank", "Cash"] as const`
- Produces (`pricing.ts`): `parseTaka(v: unknown): number` (NaN when invalid), `formatTaka(n: number): string`, `normalizePackages(raw: unknown): PackageDef[]`, `FeeEvent { registrationFee; extraAdultFee; childFee; packages: PackageDef[] }`, `computeFee(event: FeeEvent, rsvp): FeeResult { pkg; extraAdults; extraChildren; headCount; fee; donation; total }`, `isPaidEvent(event: FeeEvent): boolean`, `MAX_EXTRA_GUESTS = 10`.
- Produces (`availability.ts`): `ClosedReason = "CLOSED" | "DEADLINE_PASSED" | "FULL" | "PAYMENT_DETAILS_MISSING"`, `CLOSED_MESSAGES: Record<ClosedReason, string>`, `registrationClosedReason(event: AvailabilityEvent, reservedHeads: number, now: Date): ClosedReason | null`.

- [ ] **Step 1: Write the failing tests**

`tests/events/pricing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeFee, formatTaka, isPaidEvent, normalizePackages, parseTaka } from "@/lib/events/pricing";

// The Golden Jubilee's real prices ("Jubilee price model").
const jubilee = {
  registrationFee: 0,
  extraAdultFee: 500,
  childFee: 300,
  packages: normalizePackages([
    { name: "General Alumnus Delegate", price: "৳1,000", adults: 1 },
    { name: "Alumnus + Spouse / Extra Guest", price: "৳1,500", adults: 2 },
    { name: "Family (Alumnus + Spouse + 1 Child < 12yr)", price: "৳1,800", adults: 2, children: 1 },
    { name: "Golden Patron & Sponsor", price: "৳5,000", adults: 1, guestsFree: true },
  ]),
};

describe("parseTaka / formatTaka", () => {
  it("reads display prices and numbers", () => {
    expect(parseTaka("৳1,500")).toBe(1500);
    expect(parseTaka(2000)).toBe(2000);
    expect(parseTaka("Free")).toBe(0);
    expect(parseTaka(-5)).toBeNaN();
    expect(parseTaka(null)).toBeNaN();
  });
  it("formats amounts", () => {
    expect(formatTaka(1500)).toBe("৳1,500");
    expect(formatTaka(0)).toBe("Free");
  });
});

describe("computeFee (Jubilee model)", () => {
  it("prices General with one extra adult like the Spouse package", () => {
    const a = computeFee(jubilee, { packageName: "General Alumnus Delegate", extraAdults: 1 });
    const b = computeFee(jubilee, { packageName: "Alumnus + Spouse / Extra Guest" });
    expect([a.fee, a.headCount]).toEqual([1500, 2]);
    expect([b.fee, b.headCount]).toEqual([1500, 2]);
  });
  it("prices the Family package as General + adult + child", () => {
    expect(computeFee(jubilee, { packageName: "Family (Alumnus + Spouse + 1 Child < 12yr)" })).toMatchObject({ fee: 1800, headCount: 3 });
  });
  it("lets Patron bring extra guests free", () => {
    expect(computeFee(jubilee, { packageName: "Golden Patron & Sponsor", extraAdults: 2, extraChildren: 1 })).toMatchObject({ fee: 5000, headCount: 4 });
  });
  it("adds the optional donation to the total, not the fee", () => {
    expect(computeFee(jubilee, { packageName: "General Alumnus Delegate", donationAmount: 700 })).toMatchObject({ fee: 1000, donation: 700, total: 1700 });
  });
  it("uses registrationFee when an event has no packages", () => {
    expect(computeFee({ registrationFee: 200, extraAdultFee: 100, childFee: 0, packages: [] }, { extraAdults: 1 })).toMatchObject({ fee: 300, headCount: 2 });
  });
  it("rejects unknown packages, bad guest counts and bad donations", () => {
    expect(() => computeFee(jubilee, { packageName: "VIP" })).toThrow(/choose one of the event's packages/);
    expect(() => computeFee(jubilee, { packageName: "General Alumnus Delegate", extraAdults: 11 })).toThrow(/between 0 and 10/);
    expect(() => computeFee(jubilee, { packageName: "General Alumnus Delegate", extraAdults: 1.5 })).toThrow();
    expect(() => computeFee(jubilee, { packageName: "General Alumnus Delegate", donationAmount: -1 })).toThrow(/donation/);
  });
});

it("knows whether an event is paid", () => {
  expect(isPaidEvent(jubilee)).toBe(true);
  expect(isPaidEvent({ registrationFee: 0, extraAdultFee: 0, childFee: 0, packages: [] })).toBe(false);
});
```

`tests/events/availability.test.ts`:

```ts
import { expect, it } from "vitest";
import { registrationClosedReason } from "@/lib/events/availability";

const base = {
  isRegistrationOpen: true,
  registrationDeadline: new Date("2030-01-01T00:00:00Z"),
  maxAttendees: 10,
  paymentInstructions: "Send to bKash 01XXXXXXXXX",
  registrationFee: 500,
  extraAdultFee: 0,
  childFee: 0,
  packages: [],
};
const now = new Date("2029-06-01T00:00:00Z");

it("is open when nothing blocks it", () => {
  expect(registrationClosedReason(base, 5, now)).toBeNull();
});
it("reports each closing reason", () => {
  expect(registrationClosedReason({ ...base, isRegistrationOpen: false }, 0, now)).toBe("CLOSED");
  expect(registrationClosedReason(base, 0, new Date("2030-01-02T00:00:00Z"))).toBe("DEADLINE_PASSED");
  expect(registrationClosedReason(base, 10, now)).toBe("FULL");
  expect(registrationClosedReason({ ...base, paymentInstructions: "  " }, 0, now)).toBe("PAYMENT_DETAILS_MISSING");
});
it("does not need payment details for free events", () => {
  expect(registrationClosedReason({ ...base, registrationFee: 0, paymentInstructions: null }, 0, now)).toBeNull();
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test -- tests/events/pricing.test.ts tests/events/availability.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `lib/events/types.ts`**

```ts
import type { EventItem } from "@/lib/data";
import type { ClosedReason } from "./availability";

export const PAYMENT_METHODS = ["bKash", "Nagad", "Bank", "Cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type RegistrationStatusValue = "PENDING_PAYMENT" | "CONFIRMED" | "CHECKED_IN" | "CANCELLED";

/** A package as stored in Event.packages (price in whole taka). */
export interface PackageDef {
  name: string;
  price: number;
  description: string;
  includes: string[];
  isPopular: boolean;
  /** People covered by the package price, including the member. */
  adults: number;
  children: number;
  /** Extra guests beyond the package are free (e.g. Patron). */
  guestsFree: boolean;
}

export interface AgendaEntry {
  time: string;
  activity: string;
}

export interface RsvpInput {
  packageName?: string | null;
  extraAdults?: number;
  extraChildren?: number;
  tshirtSize?: string | null;
  mealPreference?: string | null;
  paymentMethod?: string | null;
  transactionId?: string | null;
  donationAmount?: number;
  notes?: string | null;
}

export interface AccountInput {
  fullName: string;
  email: string;
  phone?: string | null;
  password: string;
  sscBatch: number | string;
  rollNumber?: string | null;
  section?: string | null;
  profession?: string | null;
  company?: string | null;
  locationCity?: string | null;
}

/** Package as sent to pages: display price plus the numbers the form needs. */
export interface PublicPackage {
  name: string;
  price: string;
  priceAmount: number;
  description: string;
  includes: string[];
  isPopular?: boolean;
  adults: number;
  children: number;
  guestsFree: boolean;
}

/** Event as returned by the public APIs; a superset of the EventItem pages already use. */
export type PublicEvent = Omit<EventItem, "packages"> & {
  slug: string;
  packages: PublicPackage[];
  placesLeft: number;
  closedReason: ClosedReason | null;
  closedMessage: string | null;
  isMembershipEvent: boolean;
  registrationFeeAmount: number;
  extraAdultFee: number;
  childFee: number;
  paymentInstructions: string | null;
};

export interface TicketInfo {
  /** Text encoded in the QR code: "SSGHS-TICKET:<token>". */
  qrText: string;
  qrDataUrl: string;
}

export interface MemberRegistration {
  id: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventDate: string;
  status: RegistrationStatusValue;
  packageName: string | null;
  headCount: number;
  totalFee: number;
  donationAmount: number;
  paymentMethod: string | null;
  transactionId: string | null;
  createdAt: string;
  ticket: TicketInfo | null;
}

export interface AdminRegistration {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  batch: number | null;
  rollNumber: string | null;
  section: string | null;
  membershipStatus: "PENDING" | "VERIFIED" | "REJECTED";
  packageName: string | null;
  extraAdults: number;
  extraChildren: number;
  headCount: number;
  totalFee: number;
  donationAmount: number;
  tshirtSize: string | null;
  mealPreference: string | null;
  paymentMethod: string | null;
  transactionId: string | null;
  status: RegistrationStatusValue;
  confirmedBy: string | null;
  confirmedAt: string | null;
  checkedInAt: string | null;
  createdAt: string;
}
```

- [ ] **Step 4: Create `lib/events/pricing.ts`**

```ts
import { AppError } from "@/lib/app-error";
import type { PackageDef } from "./types";

export const MAX_EXTRA_GUESTS = 10;
const MAX_DONATION = 1_000_000;

/** Reads "৳1,500", "1500" or 1500 as 1500; "Free" as 0. Returns NaN for anything unusable. */
export function parseTaka(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : NaN;
  if (typeof value !== "string") return NaN;
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function formatTaka(amount: number): string {
  return amount === 0 ? "Free" : `৳${amount.toLocaleString("en-US")}`;
}

function toCount(value: unknown, fallback: number): number {
  const n = Number(value);
  return value !== undefined && Number.isInteger(n) && n >= 0 && n <= 20 ? n : fallback;
}

/** Cleans admin input or stored JSON into packages; drops entries without a name or price. */
export function normalizePackages(raw: unknown): PackageDef[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): PackageDef[] => {
    if (!item || typeof item !== "object") return [];
    const p = item as Record<string, unknown>;
    const name = typeof p.name === "string" ? p.name.trim() : "";
    const price = parseTaka(p.price);
    if (!name || Number.isNaN(price)) return [];
    return [
      {
        name,
        price,
        description: typeof p.description === "string" ? p.description : "",
        includes: Array.isArray(p.includes) ? p.includes.filter((s): s is string => typeof s === "string") : [],
        isPopular: p.isPopular === true,
        adults: Math.max(1, toCount(p.adults, 1)),
        children: toCount(p.children, 0),
        guestsFree: p.guestsFree === true,
      },
    ];
  });
}

export interface FeeEvent {
  registrationFee: number;
  extraAdultFee: number;
  childFee: number;
  packages: PackageDef[];
}

export interface FeeResult {
  pkg: PackageDef | null;
  extraAdults: number;
  extraChildren: number;
  headCount: number;
  fee: number;
  donation: number;
  total: number;
}

function guestCount(value: number | undefined, label: string): number {
  if (value === undefined || value === null) return 0;
  if (!Number.isInteger(value) || value < 0 || value > MAX_EXTRA_GUESTS) {
    throw new AppError("INVALID_GUESTS", 400, `The number of ${label} must be between 0 and ${MAX_EXTRA_GUESTS}.`);
  }
  return value;
}

/**
 * The "Jubilee price model": the package price covers its adults and children;
 * extra guests pay the event's per-guest fees unless the package makes them free.
 * The optional donation is added to the total but never to the fee.
 */
export function computeFee(
  event: FeeEvent,
  rsvp: { packageName?: string | null; extraAdults?: number; extraChildren?: number; donationAmount?: number }
): FeeResult {
  const extraAdults = guestCount(rsvp.extraAdults, "extra adults");
  const extraChildren = guestCount(rsvp.extraChildren, "children");

  const donation = rsvp.donationAmount === undefined || rsvp.donationAmount === null ? 0 : Number(rsvp.donationAmount);
  if (!Number.isInteger(donation) || donation < 0 || donation > MAX_DONATION) {
    throw new AppError("INVALID_DONATION", 400, "The donation must be a whole number of taka.");
  }

  let pkg: PackageDef | null = null;
  if (event.packages.length > 0) {
    pkg = event.packages.find((p) => p.name === rsvp.packageName) ?? null;
    if (!pkg) throw new AppError("UNKNOWN_PACKAGE", 400, "Please choose one of the event's packages.");
  }

  const base = pkg ? pkg.price : event.registrationFee;
  const guestFees = pkg?.guestsFree ? 0 : extraAdults * event.extraAdultFee + extraChildren * event.childFee;
  const fee = base + guestFees;
  const headCount = (pkg ? pkg.adults + pkg.children : 1) + extraAdults + extraChildren;
  return { pkg, extraAdults, extraChildren, headCount, fee, donation, total: fee + donation };
}

export function isPaidEvent(event: FeeEvent): boolean {
  return event.registrationFee > 0 || event.packages.some((p) => p.price > 0);
}
```

- [ ] **Step 5: Create `lib/events/availability.ts`**

```ts
import { isPaidEvent, type FeeEvent } from "./pricing";

export type ClosedReason = "CLOSED" | "DEADLINE_PASSED" | "FULL" | "PAYMENT_DETAILS_MISSING";

export const CLOSED_MESSAGES: Record<ClosedReason, string> = {
  CLOSED: "Registration is closed.",
  DEADLINE_PASSED: "The registration deadline has passed.",
  FULL: "This event is full.",
  PAYMENT_DETAILS_MISSING: "Payment details coming soon.",
};

export interface AvailabilityEvent extends FeeEvent {
  isRegistrationOpen: boolean;
  registrationDeadline: Date | null;
  maxAttendees: number;
  paymentInstructions: string | null;
}

/** Why registration is closed right now, or null when it is open. */
export function registrationClosedReason(event: AvailabilityEvent, reservedHeads: number, now: Date): ClosedReason | null {
  if (!event.isRegistrationOpen) return "CLOSED";
  if (event.registrationDeadline && now > event.registrationDeadline) return "DEADLINE_PASSED";
  if (reservedHeads >= event.maxAttendees) return "FULL";
  // Never ask anyone to pay without telling them where.
  if (isPaidEvent(event) && !event.paymentInstructions?.trim()) return "PAYMENT_DETAILS_MISSING";
  return null;
}
```

- [ ] **Step 6: Run to verify they pass**

Run: `npm test -- tests/events/pricing.test.ts tests/events/availability.test.ts`
Expected: all passed.

- [ ] **Step 7: Commit**

```bash
git add lib/events tests/events/pricing.test.ts tests/events/availability.test.ts
git commit -m "feat(events): add Jubilee pricing model and registration availability rules"
```

---

### Task 5: Shared member-account creation; close free sign-up

**Files:**
- Create: `lib/members/create-member.ts`
- Modify: `app/api/auth/register/route.ts` (whole file)
- Test: `tests/members/create-member.test.ts`

**Interfaces:**
- Consumes: `AppError` (Task 3), `AccountInput` (Task 4).
- Produces: `createMemberAccount(db: Prisma.TransactionClient, input: AccountInput): Promise<{ id: string; email: string }>` — creates a `PENDING` user, profile and `VerificationRequest`; throws `AppError("EMAIL_EXISTS", 409, "You already have an account — sign in to register.")`, `AppError("INVALID_ACCOUNT", 400, …)`.

- [ ] **Step 1: Write the failing test `tests/members/create-member.test.ts`**

```ts
import { beforeEach, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createMemberAccount } from "@/lib/members/create-member";
import { makeMember, resetDatabase } from "../helpers/db";

beforeEach(resetDatabase);

const input = {
  fullName: "  Farhana Akter ",
  email: " Farhana@Example.TEST ",
  phone: "+880 1711-000111",
  password: "Member-Pw-2026",
  sscBatch: "1995",
  rollNumber: " 1044 ",
  section: "B",
};

it("creates a pending member with profile and verification request", async () => {
  const created = await prisma.$transaction((tx) => createMemberAccount(tx, input));
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: created.id },
    include: { profile: true, verificationRequests: true },
  });
  expect(user).toMatchObject({ email: "farhana@example.test", status: "PENDING", role: "ALUMNI" });
  expect(user.profile).toMatchObject({ fullName: "Farhana Akter", sscBatch: 1995, rollNumber: "1044", section: "B", verificationStatus: "PENDING" });
  expect(user.verificationRequests[0]).toMatchObject({ sscBatch: 1995, rollNumber: "1044", status: "PENDING" });
});

it("refuses an email that already has an account", async () => {
  await makeMember({ email: "taken@example.test" });
  await expect(
    prisma.$transaction((tx) => createMemberAccount(tx, { ...input, email: "TAKEN@example.test" }))
  ).rejects.toMatchObject({ status: 409, code: "EMAIL_EXISTS" });
});

it("validates required fields, batch and password length", async () => {
  await expect(prisma.$transaction((tx) => createMemberAccount(tx, { ...input, fullName: " " }))).rejects.toMatchObject({ status: 400 });
  await expect(prisma.$transaction((tx) => createMemberAccount(tx, { ...input, sscBatch: "1900" }))).rejects.toMatchObject({ status: 400 });
  await expect(prisma.$transaction((tx) => createMemberAccount(tx, { ...input, password: "short" }))).rejects.toMatchObject({ status: 400 });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- tests/members/create-member.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/members/create-member.ts`**

```ts
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/app-error";
import type { AccountInput } from "@/lib/events/types";

const FIRST_SSC_BATCH = 1985;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Creates a PENDING member account with profile and verification request.
 * Shared by the combined membership registration form now, and by a separate
 * sign-up flow later, so separating membership from the Jubilee stays cheap.
 */
export async function createMemberAccount(
  db: Prisma.TransactionClient,
  input: AccountInput
): Promise<{ id: string; email: string }> {
  const fullName = input.fullName?.trim();
  const email = input.email?.trim().toLowerCase();
  const batch = Number(input.sscBatch);
  if (!fullName || !email || !input.password) {
    throw new AppError("INVALID_ACCOUNT", 400, "Please fill in your name, email and password.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("INVALID_ACCOUNT", 400, "Please enter a valid email address.");
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError("INVALID_ACCOUNT", 400, `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!Number.isInteger(batch) || batch < FIRST_SSC_BATCH || batch > new Date().getFullYear()) {
    throw new AppError("INVALID_ACCOUNT", 400, "Please choose your SSC batch year.");
  }

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new AppError("EMAIL_EXISTS", 409, "You already have an account — sign in to register.");
  }

  const rollNumber = input.rollNumber?.trim() || null;
  const user = await db.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: "ALUMNI",
      status: "PENDING",
      profile: {
        create: {
          fullName,
          sscBatch: batch,
          graduationYear: batch,
          profession: input.profession?.trim() || "Alumnus",
          company: input.company?.trim() || null,
          locationCity: input.locationCity?.trim() || "Chattogram",
          locationCountry: "Bangladesh",
          phone: input.phone?.trim() || null,
          rollNumber,
          section: input.section?.trim() || null,
          bio: `Alumnus of SSGHS Batch ${batch}`,
          verificationStatus: "PENDING",
          avatarUrl: "/logo.png",
        },
      },
      verificationRequests: { create: { sscBatch: batch, rollNumber, status: "PENDING" } },
    },
    select: { id: true, email: true },
  });
  return user;
}
```

- [ ] **Step 4: Close the free sign-up route — replace `app/api/auth/register/route.ts` with**

```ts
import { NextResponse } from "next/server";

// Joining the association is the paid Golden Jubilee registration
// (POST /api/events/[slug]/rsvp), so no free account can be created here.
export async function POST() {
  return NextResponse.json(
    { error: "Join the association through the Golden Jubilee registration.", code: "JOIN_THROUGH_JUBILEE" },
    { status: 410 }
  );
}
```

- [ ] **Step 5: Run to verify, typecheck and lint**

Run: `npm test -- tests/members/create-member.test.ts && npx tsc --noEmit -p . && npx eslint lib/members app/api/auth/register`
Expected: 3 passed; no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/members app/api/auth/register/route.ts tests/members
git commit -m "feat(members): share account creation and close free sign-up"
```

---

### Task 6: Event service and event APIs

**Files:**
- Create: `lib/events/service.ts`, `app/api/events/[slug]/route.ts`, `app/api/events/membership/route.ts`, `app/api/admin/events/route.ts`, `app/api/admin/events/[id]/route.ts`
- Modify: `app/api/events/route.ts` (whole file), `lib/data.ts` (`EventItem` type only)
- Delete: `app/api/events/[id]/route.ts` (the admin edit/delete move to `/api/admin/events/[id]`; a sibling `[id]` next to `[slug]` is not allowed)
- Test: `tests/events/service.test.ts`

**Interfaces:**
- Consumes: pricing/availability (Task 4), `AppError`, `getSessionUser`/`isAdminRole` (`lib/session-user.ts`).
- Produces:
  - `toPublicEvent(row: Event, heads: { reserved: number; attending: number }, now: Date): PublicEvent`
  - `headCounts(eventIds: string[]): Promise<Map<string, { reserved: number; attending: number }>>`
  - `listPublicEvents(now?: Date): Promise<PublicEvent[]>` (date ascending)
  - `getPublicEventBySlug(slug: string, now?: Date): Promise<PublicEvent | null>`
  - `getMembershipEvent(now?: Date): Promise<PublicEvent | null>`
  - `createEvent(body: unknown): Promise<PublicEvent>`, `updateEvent(id: string, body: unknown): Promise<PublicEvent>`, `deleteEvent(id: string): Promise<void>`
  - `eventFeeRules(row: Event): FeeEvent` (reused by Task 7)
  - `EventItem` gains optional `slug?`, `isMembershipEvent?`, `placesLeft?`, `closedMessage?`.

- [ ] **Step 1: Write the failing test `tests/events/service.test.ts`**

```ts
import { beforeEach, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createEvent, deleteEvent, getMembershipEvent, getPublicEventBySlug, listPublicEvents, updateEvent } from "@/lib/events/service";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

beforeEach(resetDatabase);

const jubileeBody = {
  title: "50 Years Golden Jubilee",
  description: "Grand celebration",
  date: "2026-12-30",
  venue: "School Campus",
  category: "REUNION",
  maxAttendees: 5000,
  isMegaEvent: true,
  isMembershipEvent: true,
  extraAdultFee: 500,
  childFee: 300,
  paymentInstructions: "Send to bKash 01XXXXXXXXX",
  packages: [{ name: "General Alumnus Delegate", price: "৳1,000", adults: 1 }],
  agenda: [{ time: "Day 1 - 09:00 AM", activity: "Opening" }],
};

it("creates an event with a unique slug and returns the public shape", async () => {
  const a = await createEvent(jubileeBody);
  const b = await createEvent({ ...jubileeBody, isMembershipEvent: false });
  expect(a.slug).toBe("50-years-golden-jubilee");
  expect(b.slug).not.toBe(a.slug);
  expect(a.packages[0]).toMatchObject({ price: "৳1,000", priceAmount: 1000, adults: 1 });
  expect(a.isRegistrationOpen).toBe(true);
});

it("keeps only one membership event", async () => {
  const first = await createEvent(jubileeBody);
  const second = await createEvent({ ...jubileeBody, title: "Second" });
  expect((await getMembershipEvent())?.id).toBe(second.id);
  expect((await getPublicEventBySlug(first.slug))?.isMembershipEvent).toBe(false);
});

it("refuses a free membership event", async () => {
  await expect(createEvent({ ...jubileeBody, packages: [], registrationFee: 0 })).rejects.toMatchObject({ status: 400 });
});

it("computes live counts and places left from registrations", async () => {
  const event = await makeEvent({ maxAttendees: 10, isRegistrationOpen: true });
  const [a, b] = [await makeMember(), await makeMember()];
  await prisma.eventRegistration.create({ data: { eventId: event.id, userId: a.id, headCount: 3, status: "CONFIRMED" } });
  await prisma.eventRegistration.create({ data: { eventId: event.id, userId: b.id, headCount: 2, status: "PENDING_PAYMENT" } });
  const pub = await getPublicEventBySlug(event.slug);
  expect(pub).toMatchObject({ attendeesCount: 3, placesLeft: 5 });
});

it("reports why registration is closed", async () => {
  const event = await makeEvent({ registrationFee: 500, paymentInstructions: null });
  expect(await getPublicEventBySlug(event.slug)).toMatchObject({ isRegistrationOpen: false, closedMessage: "Payment details coming soon." });
});

it("does not change a stored registration fee when the price changes", async () => {
  const created = await createEvent(jubileeBody);
  const member = await makeMember();
  await prisma.eventRegistration.create({ data: { eventId: created.id, userId: member.id, totalFee: 1000 } });
  await updateEvent(created.id, { packages: [{ name: "General Alumnus Delegate", price: 2000 }] });
  expect((await prisma.eventRegistration.findFirstOrThrow()).totalFee).toBe(1000);
});

it("refuses to delete an event that has registrations", async () => {
  const event = await makeEvent();
  await prisma.eventRegistration.create({ data: { eventId: event.id, userId: (await makeMember()).id } });
  await expect(deleteEvent(event.id)).rejects.toMatchObject({ status: 409 });
});

it("lists events by date", async () => {
  await makeEvent({ title: "Later", date: new Date("2031-01-01") });
  await makeEvent({ title: "Sooner", date: new Date("2030-06-01") });
  expect((await listPublicEvents()).map((e) => e.title)).toEqual(["Sooner", "Later"]);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- tests/events/service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Extend `EventItem` in `lib/data.ts`**

In `export interface EventItem { … }` add, after `souvenirDetails?: string;`:

```ts
  slug?: string;
  isMembershipEvent?: boolean;
  placesLeft?: number;
  closedMessage?: string | null;
```

- [ ] **Step 4: Create `lib/events/service.ts`**

```ts
import type { Event, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { CLOSED_MESSAGES, registrationClosedReason } from "./availability";
import { formatTaka, isPaidEvent, normalizePackages, parseTaka, type FeeEvent } from "./pricing";
import type { AgendaEntry, PublicEvent } from "./types";

const EVENT_CATEGORIES = ["REUNION", "SPORTS", "WEBINAR", "CULTURAL", "COMMUNITY"] as const;
// Static API segments under /api/events; an event slug must never shadow them.
const RESERVED_SLUGS = new Set(["membership", "verify-ticket"]);

export function eventFeeRules(row: Event): FeeEvent {
  return {
    registrationFee: row.registrationFee,
    extraAdultFee: row.extraAdultFee,
    childFee: row.childFee,
    packages: normalizePackages(row.packages),
  };
}

function normalizeAgenda(raw: unknown): AgendaEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): AgendaEntry[] => {
    if (!item || typeof item !== "object") return [];
    const a = item as Record<string, unknown>;
    return typeof a.time === "string" && typeof a.activity === "string" && a.activity.trim()
      ? [{ time: a.time.trim(), activity: a.activity.trim() }]
      : [];
  });
}

function normalizeHighlights(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string" && s.trim() !== "") : [];
}

export function toPublicEvent(row: Event, heads: { reserved: number; attending: number }, now: Date): PublicEvent {
  const rules = eventFeeRules(row);
  const closedReason = registrationClosedReason({ ...row, ...rules }, heads.reserved, now);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    date: row.date.toISOString().slice(0, 10),
    time: row.time ?? "",
    venue: row.venue,
    locationCity: row.locationCity,
    organizer: row.organizer ?? "SSGHS Alumni Association",
    bannerImage: row.bannerImage ?? "/golden-jubilee.jpg",
    maxAttendees: row.maxAttendees,
    attendeesCount: heads.attending,
    placesLeft: Math.max(0, row.maxAttendees - heads.reserved),
    description: row.description,
    isRegistrationOpen: closedReason === null,
    closedReason,
    closedMessage: closedReason ? CLOSED_MESSAGES[closedReason] : null,
    isMegaEvent: row.isMegaEvent,
    isMembershipEvent: row.isMembershipEvent,
    subtitle: row.subtitle ?? undefined,
    guestOfHonor: row.guestOfHonor ?? undefined,
    souvenirDetails: row.souvenirDetails ?? undefined,
    registrationDeadline: row.registrationDeadline?.toISOString(),
    registrationFee: formatTaka(row.registrationFee),
    registrationFeeAmount: row.registrationFee,
    extraAdultFee: row.extraAdultFee,
    childFee: row.childFee,
    paymentInstructions: row.paymentInstructions,
    agenda: normalizeAgenda(row.agenda),
    highlights: normalizeHighlights(row.highlights),
    packages: rules.packages.map((p) => ({
      name: p.name,
      price: formatTaka(p.price),
      priceAmount: p.price,
      description: p.description,
      includes: p.includes,
      isPopular: p.isPopular,
      adults: p.adults,
      children: p.children,
      guestsFree: p.guestsFree,
    })),
  };
}

/** Head counts per event: reserved (pending + confirmed + checked in) and attending (confirmed + checked in). */
export async function headCounts(eventIds: string[]): Promise<Map<string, { reserved: number; attending: number }>> {
  const counts = new Map(eventIds.map((id) => [id, { reserved: 0, attending: 0 }]));
  if (eventIds.length === 0) return counts;
  const rows = await prisma.eventRegistration.groupBy({
    by: ["eventId", "status"],
    where: { eventId: { in: eventIds }, status: { not: "CANCELLED" } },
    _sum: { headCount: true },
  });
  for (const row of rows) {
    const entry = counts.get(row.eventId)!;
    const heads = row._sum.headCount ?? 0;
    entry.reserved += heads;
    if (row.status !== "PENDING_PAYMENT") entry.attending += heads;
  }
  return counts;
}

async function toPublicList(rows: Event[], now: Date): Promise<PublicEvent[]> {
  const counts = await headCounts(rows.map((r) => r.id));
  return rows.map((r) => toPublicEvent(r, counts.get(r.id)!, now));
}

export async function listPublicEvents(now = new Date()): Promise<PublicEvent[]> {
  return toPublicList(await prisma.event.findMany({ orderBy: { date: "asc" } }), now);
}

export async function getPublicEventBySlug(slug: string, now = new Date()): Promise<PublicEvent | null> {
  const row = await prisma.event.findUnique({ where: { slug } });
  return row ? (await toPublicList([row], now))[0] : null;
}

export async function getMembershipEvent(now = new Date()): Promise<PublicEvent | null> {
  const row = await prisma.event.findFirst({ where: { isMembershipEvent: true } });
  return row ? (await toPublicList([row], now))[0] : null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

async function uniqueSlug(db: Prisma.TransactionClient, source: string): Promise<string> {
  const base = slugify(source) || "event";
  let candidate = base;
  for (let n = 2; RESERVED_SLUGS.has(candidate) || (await db.event.findUnique({ where: { slug: candidate }, select: { id: true } })); n++) {
    candidate = `${base}-${n}`;
  }
  return candidate;
}

function text(v: unknown): string | undefined {
  return typeof v === "string" ? v.trim() : undefined;
}
function optionalText(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function amount(v: unknown, label: string): number | undefined {
  if (v === undefined) return undefined;
  const n = parseTaka(v);
  if (Number.isNaN(n)) throw new AppError("INVALID_EVENT", 400, `${label} must be an amount of taka.`);
  return n;
}
function dateValue(v: unknown, label: string): Date | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const d = new Date(typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T09:00:00+06:00` : String(v));
  if (Number.isNaN(d.getTime())) throw new AppError("INVALID_EVENT", 400, `${label} is not a valid date.`);
  return d;
}

/** Validates admin input into Prisma data. Only fields present in `body` are returned. */
function parseEventInput(body: unknown, mode: "create" | "update"): Prisma.EventUncheckedUpdateInput {
  if (!body || typeof body !== "object") throw new AppError("INVALID_EVENT", 400, "Invalid event data.");
  const b = body as Record<string, unknown>;
  const data: Prisma.EventUncheckedUpdateInput = {};

  const title = text(b.title);
  if (title !== undefined) data.title = title;
  if (mode === "create" && !title) throw new AppError("INVALID_EVENT", 400, "The event needs a title.");

  for (const [key, label] of [["description", "Description"], ["venue", "Venue"]] as const) {
    const value = text(b[key]);
    if (value !== undefined) data[key] = value;
    if (mode === "create" && !value) throw new AppError("INVALID_EVENT", 400, `${label} is required.`);
  }

  const date = dateValue(b.date, "The event date");
  if (date) data.date = date;
  if (mode === "create" && !date) throw new AppError("INVALID_EVENT", 400, "The event date is required.");

  if (b.category !== undefined) {
    if (!EVENT_CATEGORIES.includes(b.category as (typeof EVENT_CATEGORIES)[number])) {
      throw new AppError("INVALID_EVENT", 400, "Unknown event category.");
    }
    data.category = b.category as (typeof EVENT_CATEGORIES)[number];
  }

  if (b.maxAttendees !== undefined) {
    const max = Number(b.maxAttendees);
    if (!Number.isInteger(max) || max < 1) throw new AppError("INVALID_EVENT", 400, "Capacity must be a whole number above 0.");
    data.maxAttendees = max;
  }

  const registrationFee = amount(b.registrationFee, "The registration fee");
  if (registrationFee !== undefined) data.registrationFee = registrationFee;
  const extraAdultFee = amount(b.extraAdultFee, "The extra adult fee");
  if (extraAdultFee !== undefined) data.extraAdultFee = extraAdultFee;
  const childFee = amount(b.childFee, "The child fee");
  if (childFee !== undefined) data.childFee = childFee;

  for (const key of ["time", "locationCity", "organizer", "bannerImage", "subtitle", "guestOfHonor", "souvenirDetails", "paymentInstructions"] as const) {
    const value = optionalText(b[key]);
    if (value !== undefined) (data as Record<string, unknown>)[key] = value;
  }
  if (b.registrationDeadline !== undefined) {
    data.registrationDeadline = b.registrationDeadline ? dateValue(b.registrationDeadline, "The registration deadline") : null;
  }
  for (const key of ["isRegistrationOpen", "isMegaEvent", "isMembershipEvent"] as const) {
    if (typeof b[key] === "boolean") data[key] = b[key] as boolean;
  }
  if (b.packages !== undefined) data.packages = normalizePackages(b.packages) as unknown as Prisma.InputJsonValue;
  if (b.agenda !== undefined) data.agenda = normalizeAgenda(b.agenda) as unknown as Prisma.InputJsonValue;
  if (b.highlights !== undefined) data.highlights = normalizeHighlights(b.highlights);
  return data;
}

/** Enforces membership-event rules on the saved row, inside the same transaction. */
async function applyMembershipRules(db: Prisma.TransactionClient, row: Event): Promise<void> {
  if (!row.isMembershipEvent) return;
  if (!isPaidEvent(eventFeeRules(row))) {
    throw new AppError("FREE_MEMBERSHIP_EVENT", 400, "The membership event must have a paid package or registration fee.");
  }
  await db.event.updateMany({ where: { isMembershipEvent: true, id: { not: row.id } }, data: { isMembershipEvent: false } });
}

async function toPublicById(id: string): Promise<PublicEvent> {
  const row = await prisma.event.findUniqueOrThrow({ where: { id } });
  return (await toPublicList([row], new Date()))[0];
}

export async function createEvent(body: unknown): Promise<PublicEvent> {
  const data = parseEventInput(body, "create");
  const id = await prisma.$transaction(async (tx) => {
    const row = await tx.event.create({
      data: { ...(data as Prisma.EventUncheckedCreateInput), slug: await uniqueSlug(tx, String(data.title)) },
    });
    await applyMembershipRules(tx, row);
    return row.id;
  });
  return toPublicById(id);
}

export async function updateEvent(id: string, body: unknown): Promise<PublicEvent> {
  const data = parseEventInput(body, "update");
  await prisma.$transaction(async (tx) => {
    const existing = await tx.event.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new AppError("EVENT_NOT_FOUND", 404, "Event not found.");
    await applyMembershipRules(tx, await tx.event.update({ where: { id }, data }));
  });
  return toPublicById(id);
}

export async function deleteEvent(id: string): Promise<void> {
  const registrations = await prisma.eventRegistration.count({ where: { eventId: id } });
  if (registrations > 0) {
    throw new AppError("EVENT_HAS_REGISTRATIONS", 409, "This event has registrations. Close registration instead of deleting it.");
  }
  await prisma.event.delete({ where: { id } }).catch(() => {
    throw new AppError("EVENT_NOT_FOUND", 404, "Event not found.");
  });
}
```

- [ ] **Step 5: Public routes**

Replace `app/api/events/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { listPublicEvents } from "@/lib/events/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ events: await listPublicEvents() });
  } catch (err) {
    return errorResponse(err, "GET /api/events");
  }
}
```

Create `app/api/events/[slug]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { getPublicEventBySlug } from "@/lib/events/service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const event = await getPublicEventBySlug((await params).slug);
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    return NextResponse.json({ event });
  } catch (err) {
    return errorResponse(err, "GET /api/events/[slug]");
  }
}
```

Create `app/api/events/membership/route.ts`:

```ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { getMembershipEvent } from "@/lib/events/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const event = await getMembershipEvent();
    if (!event) return NextResponse.json({ error: "Membership registration opens soon." }, { status: 404 });
    return NextResponse.json({ event });
  } catch (err) {
    return errorResponse(err, "GET /api/events/membership");
  }
}
```

- [ ] **Step 6: Admin routes (move from `/api/events/[id]`)**

Delete `app/api/events/[id]/route.ts`. Create `app/api/admin/events/route.ts`:

```ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { createEvent, listPublicEvents } from "@/lib/events/service";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

const forbidden = () => NextResponse.json({ error: "Only administrators can manage events." }, { status: 403 });

export async function GET() {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) return forbidden();
  try {
    return NextResponse.json({ events: await listPublicEvents() });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/events");
  }
}

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) return forbidden();
  try {
    return NextResponse.json({ event: await createEvent(await req.json()) }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/events");
  }
}
```

Create `app/api/admin/events/[id]/route.ts` (the `GET` handler is added in Task 8):

```ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { deleteEvent, updateEvent } from "@/lib/events/service";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

type Params = { params: Promise<{ id: string }> };
const forbidden = () => NextResponse.json({ error: "Only administrators can manage events." }, { status: 403 });

export async function PUT(req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) return forbidden();
  try {
    return NextResponse.json({ event: await updateEvent((await params).id, await req.json()) });
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/events/[id]");
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) return forbidden();
  try {
    await deleteEvent((await params).id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/events/[id]");
  }
}
```

- [ ] **Step 7: Run to verify, typecheck and lint**

Run: `npm test -- tests/events/service.test.ts && npx tsc --noEmit -p . && npx eslint lib/events app/api/events app/api/admin/events`
Expected: 8 passed; no errors. (`app/api/events/[id]/rsvp` and `ticket` still exist; they are replaced in Tasks 7 and 9.)

- [ ] **Step 8: Commit**

```bash
git add lib/events/service.ts lib/data.ts app/api/events app/api/admin/events tests/events/service.test.ts
git commit -m "feat(events): read and manage events from the database"
```

---

### Task 7: Registration service and RSVP API (combined form backend)

**Files:**
- Create: `lib/events/registrations.ts`, `lib/events/tickets.ts` (ticket creation part), `app/api/events/[slug]/rsvp/route.ts`, `app/api/me/registrations/route.ts`
- Delete: `app/api/events/[id]/rsvp/route.ts`
- Test: `tests/events/registrations.test.ts`

**Interfaces:**
- Consumes: `createMemberAccount` (Task 5), `computeFee`/`registrationClosedReason` (Task 4), `eventFeeRules`/`headCounts` (Task 6), `sealJson` (Task 3), `generateQrDataUrl` (`lib/id-card.ts`).
- Produces:
  - `registerForEvent(args: { slug: string; sessionUserId: string | null; account?: AccountInput; rsvp: RsvpInput; now?: Date }): Promise<{ registration: MemberRegistration; createdAccount: { email: string } | null }>`
  - `getMemberRegistration(slug: string, userId: string): Promise<MemberRegistration | null>`
  - `listMemberRegistrations(userId: string): Promise<MemberRegistration[]>`
  - `TICKET_QR_PREFIX = "SSGHS-TICKET:"`, `createTicketToken(registrationId: string): string`, `readTicketToken(scan: string): string | null` (returns the registration id), `ticketInfo(registrationId: string): Promise<TicketInfo>`

- [ ] **Step 1: Write the failing test `tests/events/registrations.test.ts`**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { getMemberRegistration, registerForEvent } from "@/lib/events/registrations";
import { readTicketToken, TICKET_QR_PREFIX } from "@/lib/events/tickets";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

beforeEach(resetDatabase);

const packages = [
  { name: "General", price: 1000, adults: 1, children: 0 },
  { name: "Patron", price: 5000, adults: 1, children: 0, guestsFree: true },
];
const membershipEvent = () =>
  makeEvent({ slug: "jubilee", isMembershipEvent: true, packages, extraAdultFee: 500, childFee: 300, paymentInstructions: "bKash 01XXXXXXXXX", maxAttendees: 10 });
const account = { fullName: "New Member", email: "new@example.test", password: "Member-Pw-2026", sscBatch: 2001, rollNumber: "12", section: "A" };
const paidRsvp = { packageName: "General", extraAdults: 1, paymentMethod: "bKash", transactionId: " 9ab3xk1 ", donationAmount: 500 };

describe("joining through the membership event", () => {
  it("creates the account, verification request and pending registration together", async () => {
    await membershipEvent();
    const { registration, createdAccount } = await registerForEvent({ slug: "jubilee", sessionUserId: null, account, rsvp: paidRsvp });
    expect(createdAccount).toEqual({ email: "new@example.test" });
    expect(registration).toMatchObject({ status: "PENDING_PAYMENT", headCount: 2, totalFee: 1500, donationAmount: 500, transactionId: "9AB3XK1", ticket: null });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "new@example.test" }, include: { verificationRequests: true } });
    expect(user.status).toBe("PENDING");
    expect(user.verificationRequests).toHaveLength(1);
  });

  it("leaves nothing behind when the registration fails", async () => {
    await membershipEvent();
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, rsvp: { ...paidRsvp, transactionId: "" } })).rejects.toMatchObject({ status: 400 });
    expect(await prisma.user.count()).toBe(0);
  });

  it("never attaches a registration to an existing account", async () => {
    await membershipEvent();
    await makeMember({ email: "new@example.test" });
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, rsvp: paidRsvp })).rejects.toMatchObject({ status: 409, code: "EMAIL_EXISTS" });
    expect(await prisma.eventRegistration.count()).toBe(0);
  });

  it("refuses a zero-fee membership registration", async () => {
    await makeEvent({ slug: "jubilee", isMembershipEvent: true, packages: [{ name: "Free", price: 0 }], paymentInstructions: "x" });
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, rsvp: { packageName: "Free" } })).rejects.toMatchObject({ status: 400 });
  });

  it("uses the server price even if the form sends another fee", async () => {
    await membershipEvent();
    const { registration } = await registerForEvent({ slug: "jubilee", sessionUserId: null, account, rsvp: { ...paidRsvp, totalFee: 1 } as never });
    expect(registration.totalFee).toBe(1500);
  });

  it("treats transaction IDs case- and space-insensitively", async () => {
    await membershipEvent();
    const member = await makeMember();
    await registerForEvent({ slug: "jubilee", sessionUserId: member.id, rsvp: paidRsvp });
    await expect(
      registerForEvent({ slug: "jubilee", sessionUserId: null, account, rsvp: { ...paidRsvp, transactionId: "9AB3XK1" } })
    ).rejects.toMatchObject({ status: 409, code: "DUPLICATE_TRANSACTION" });
  });
});

describe("other events", () => {
  it("needs a signed-in, verified member", async () => {
    await makeEvent({ slug: "picnic" });
    await expect(registerForEvent({ slug: "picnic", sessionUserId: null, account, rsvp: {} })).rejects.toMatchObject({ status: 401 });
    const pending = await makeMember({ status: "PENDING" });
    await expect(registerForEvent({ slug: "picnic", sessionUserId: pending.id, rsvp: {} })).rejects.toMatchObject({ status: 403 });
  });

  it("confirms free events straight away and gives a ticket", async () => {
    await makeEvent({ slug: "picnic" });
    const member = await makeMember();
    const { registration } = await registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} });
    expect(registration.status).toBe("CONFIRMED");
    expect(registration.ticket?.qrText.startsWith(TICKET_QR_PREFIX)).toBe(true);
    expect(readTicketToken(registration.ticket!.qrText)).toBe(registration.id);
  });

  it("refuses a second registration and closed events", async () => {
    await makeEvent({ slug: "picnic" });
    await makeEvent({ slug: "closed", isRegistrationOpen: false });
    const member = await makeMember();
    await registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} });
    await expect(registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} })).rejects.toMatchObject({ status: 409, code: "ALREADY_REGISTERED" });
    await expect(registerForEvent({ slug: "closed", sessionUserId: member.id, rsvp: {} })).rejects.toMatchObject({ status: 409, code: "REGISTRATION_CLOSED" });
  });

  it("never exceeds capacity, even for simultaneous registrations", async () => {
    await makeEvent({ slug: "small", maxAttendees: 1 });
    const [a, b] = [await makeMember(), await makeMember()];
    const results = await Promise.allSettled([
      registerForEvent({ slug: "small", sessionUserId: a.id, rsvp: {} }),
      registerForEvent({ slug: "small", sessionUserId: b.id, rsvp: {} }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.eventRegistration.count()).toBe(1);
  });

  it("returns the member's own registration", async () => {
    await makeEvent({ slug: "picnic" });
    const member = await makeMember();
    await registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} });
    expect(await getMemberRegistration("picnic", member.id)).toMatchObject({ eventSlug: "picnic", status: "CONFIRMED" });
    expect(await getMemberRegistration("picnic", (await makeMember()).id)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- tests/events/registrations.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `lib/events/tickets.ts` (issuing part; check-in is added in Task 9)**

```ts
import { generateQrDataUrl } from "@/lib/id-card";
import { openJson, sealJson } from "@/lib/sealed-token";
import type { TicketInfo } from "./types";

// Different purpose from alumni cards, so a card can never be read as a ticket.
const TICKET_PURPOSE = "ssghs-event-ticket-v1";
export const TICKET_QR_PREFIX = "SSGHS-TICKET:";

export function createTicketToken(registrationId: string): string {
  return sealJson(TICKET_PURPOSE, { rid: registrationId });
}

/** Returns the registration id in a scanned ticket, or null for anything that is not a genuine ticket. */
export function readTicketToken(scan: string): string | null {
  const token = scan.trim().startsWith(TICKET_QR_PREFIX) ? scan.trim().slice(TICKET_QR_PREFIX.length) : scan.trim();
  const opened = openJson<{ rid?: unknown }>(TICKET_PURPOSE, token);
  return opened.ok && typeof opened.value.rid === "string" ? opened.value.rid : null;
}

export async function ticketInfo(registrationId: string): Promise<TicketInfo> {
  const qrText = `${TICKET_QR_PREFIX}${createTicketToken(registrationId)}`;
  return { qrText, qrDataUrl: await generateQrDataUrl(qrText) };
}
```

- [ ] **Step 4: Create `lib/events/registrations.ts`**

```ts
import { Prisma, type Event, type EventRegistration } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { createMemberAccount } from "@/lib/members/create-member";
import { CLOSED_MESSAGES, registrationClosedReason } from "./availability";
import { computeFee } from "./pricing";
import { eventFeeRules } from "./service";
import { ticketInfo } from "./tickets";
import { PAYMENT_METHODS, type AccountInput, type MemberRegistration, type RsvpInput } from "./types";

const ACTIVE_STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN"] as const;

function normalizeTransactionId(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, "").toUpperCase();
}

async function toMemberRegistration(reg: EventRegistration & { event: Event }): Promise<MemberRegistration> {
  const hasTicket = reg.status === "CONFIRMED" || reg.status === "CHECKED_IN";
  return {
    id: reg.id,
    eventId: reg.eventId,
    eventSlug: reg.event.slug,
    eventTitle: reg.event.title,
    eventDate: reg.event.date.toISOString().slice(0, 10),
    status: reg.status,
    packageName: reg.packageName,
    headCount: reg.headCount,
    totalFee: reg.totalFee,
    donationAmount: reg.donationAmount,
    paymentMethod: reg.paymentMethod,
    transactionId: reg.transactionId,
    createdAt: reg.createdAt.toISOString(),
    ticket: hasTicket ? await ticketInfo(reg.id) : null,
  };
}

/**
 * One endpoint for joining (membership event, may create the account) and for
 * registering verified members for other events. Everything happens in one
 * transaction, so a failure never leaves half an account or registration behind.
 */
export async function registerForEvent(args: {
  slug: string;
  sessionUserId: string | null;
  account?: AccountInput;
  rsvp: RsvpInput;
  now?: Date;
}): Promise<{ registration: MemberRegistration; createdAccount: { email: string } | null }> {
  const now = args.now ?? new Date();

  const result = await prisma
    .$transaction(async (tx) => {
      // Lock the event row first, so registrations for one event run one at a time
      // and capacity checks cannot race. READ COMMITTED (below) makes the reads
      // after the lock see registrations committed while this one was waiting.
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM \`Event\` WHERE slug = ${args.slug} FOR UPDATE`;
      if (locked.length === 0) throw new AppError("EVENT_NOT_FOUND", 404, "Event not found.");
      const event = await tx.event.findUniqueOrThrow({ where: { id: locked[0].id } });

      let userId = args.sessionUserId;
      let createdAccount: { email: string } | null = null;
      if (!userId) {
        if (!event.isMembershipEvent) {
          throw new AppError("SIGN_IN_REQUIRED", 401, "Sign in to register for this event.");
        }
        if (!args.account) throw new AppError("INVALID_ACCOUNT", 400, "Please fill in your details.");
        const created = await createMemberAccount(tx, args.account);
        userId = created.id;
        createdAccount = { email: created.email };
      } else if (!event.isMembershipEvent) {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { status: true } });
        if (user?.status !== "VERIFIED") {
          throw new AppError("VERIFIED_MEMBERS_ONLY", 403, "Only verified members can register for this event.");
        }
      }

      const reserved = await tx.eventRegistration.aggregate({
        where: { eventId: event.id, status: { in: [...ACTIVE_STATUSES] } },
        _sum: { headCount: true },
      });
      const reservedHeads = reserved._sum.headCount ?? 0;
      const rules = eventFeeRules(event);
      const closed = registrationClosedReason({ ...event, ...rules }, reservedHeads, now);
      if (closed) throw new AppError("REGISTRATION_CLOSED", 409, CLOSED_MESSAGES[closed]);

      const existing = await tx.eventRegistration.findUnique({
        where: { eventId_userId: { eventId: event.id, userId } },
        select: { id: true },
      });
      if (existing) throw new AppError("ALREADY_REGISTERED", 409, "You are already registered for this event.");

      const price = computeFee(rules, args.rsvp);
      if (event.isMembershipEvent && price.fee <= 0) {
        throw new AppError("MEMBERSHIP_MUST_BE_PAID", 400, "Membership registration requires a paid package.");
      }
      if (reservedHeads + price.headCount > event.maxAttendees) {
        throw new AppError("REGISTRATION_CLOSED", 409, CLOSED_MESSAGES.FULL);
      }

      const needsPayment = price.total > 0;
      const transactionId = normalizeTransactionId(args.rsvp.transactionId);
      const paymentMethod = args.rsvp.paymentMethod ?? null;
      if (needsPayment) {
        if (!PAYMENT_METHODS.includes(paymentMethod as (typeof PAYMENT_METHODS)[number])) {
          throw new AppError("PAYMENT_REQUIRED", 400, "Please choose how you paid.");
        }
        if (!/^[A-Z0-9-]{6,40}$/.test(transactionId)) {
          throw new AppError("PAYMENT_REQUIRED", 400, "Please enter the transaction ID from your payment (6–40 letters or numbers).");
        }
        if (await tx.eventRegistration.findUnique({ where: { transactionId }, select: { id: true } })) {
          throw new AppError("DUPLICATE_TRANSACTION", 409, "This transaction ID has already been used for a registration.");
        }
      }

      const registration = await tx.eventRegistration.create({
        data: {
          eventId: event.id,
          userId,
          packageName: price.pkg?.name ?? null,
          extraAdults: price.extraAdults,
          extraChildren: price.extraChildren,
          headCount: price.headCount,
          guestCount: price.headCount,
          totalFee: price.fee,
          donationAmount: price.donation,
          tshirtSize: args.rsvp.tshirtSize?.trim() || null,
          mealPreference: args.rsvp.mealPreference?.trim() || null,
          notes: args.rsvp.notes?.trim() || null,
          paymentMethod: needsPayment ? paymentMethod : null,
          transactionId: needsPayment ? transactionId : null,
          status: needsPayment ? "PENDING_PAYMENT" : "CONFIRMED",
          confirmedAt: needsPayment ? null : now,
        },
        include: { event: true },
      });
      return { registration, createdAccount };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 })
    .catch((err: unknown) => {
      // A concurrent insert can still hit the unique constraints; report it clearly.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = String(err.meta?.target ?? "");
        throw target.includes("transactionId")
          ? new AppError("DUPLICATE_TRANSACTION", 409, "This transaction ID has already been used for a registration.")
          : new AppError("ALREADY_REGISTERED", 409, "You are already registered for this event.");
      }
      throw err;
    });

  return { registration: await toMemberRegistration(result.registration), createdAccount: result.createdAccount };
}

export async function getMemberRegistration(slug: string, userId: string): Promise<MemberRegistration | null> {
  const reg = await prisma.eventRegistration.findFirst({ where: { userId, event: { slug } }, include: { event: true } });
  return reg ? toMemberRegistration(reg) : null;
}

export async function listMemberRegistrations(userId: string): Promise<MemberRegistration[]> {
  const regs = await prisma.eventRegistration.findMany({
    where: { userId },
    include: { event: true },
    orderBy: { event: { date: "asc" } },
  });
  return Promise.all(regs.map(toMemberRegistration));
}
```

- [ ] **Step 5: Routes**

Delete `app/api/events/[id]/rsvp/route.ts`. Create `app/api/events/[slug]/rsvp/route.ts`:

```ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { getMemberRegistration, registerForEvent } from "@/lib/events/registrations";
import { getSessionUser } from "@/lib/session-user";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ registration: null });
  try {
    return NextResponse.json({ registration: await getMemberRegistration((await params).slug, me.id) });
  } catch (err) {
    return errorResponse(err, "GET /api/events/[slug]/rsvp");
  }
}

export async function POST(req: Request, { params }: Params) {
  const me = await getSessionUser();
  try {
    const body = await req.json();
    const result = await registerForEvent({
      slug: (await params).slug,
      sessionUserId: me?.id ?? null,
      // Account details only count for signed-out visitors.
      account: me ? undefined : body.account,
      rsvp: body.rsvp ?? {},
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/events/[slug]/rsvp");
  }
}
```

Create `app/api/me/registrations/route.ts`:

```ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { listMemberRegistrations } from "@/lib/events/registrations";
import { getSessionUser } from "@/lib/session-user";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ registrations: await listMemberRegistrations(me.id) });
  } catch (err) {
    return errorResponse(err, "GET /api/me/registrations");
  }
}
```

- [ ] **Step 6: Run to verify, typecheck and lint**

Run: `npm test -- tests/events/registrations.test.ts && npx tsc --noEmit -p . && npx eslint lib/events app/api/events app/api/me`
Expected: 11 passed; no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/events app/api/events app/api/me tests/events/registrations.test.ts
git commit -m "feat(events): register members and join through the membership event"
```

---

### Task 8: Admin decisions (approve = pay + verify) and verification-queue guard

**Files:**
- Create: `lib/events/membership.ts`, `lib/events/admin.ts`, `app/api/admin/events/[id]/registrations/[regId]/route.ts`
- Modify: `app/api/admin/events/[id]/route.ts` (add `GET`), `app/api/admin/verifications/route.ts`, `lib/admin-verifications.ts`, `lib/data.ts` (`VerificationRequestItem`)
- Test: `tests/events/admin.test.ts`

**Interfaces:**
- Produces:
  - `hasPendingMembershipPayment(db: Prisma.TransactionClient | typeof prisma, userId: string): Promise<boolean>`
  - `getAdminEvent(id: string): Promise<{ event: PublicEvent; registrations: AdminRegistration[]; totals: { confirmedRevenue: number; pendingRevenue: number; confirmedDonations: number; headCount: number } }>`
  - `decideRegistration(args: { eventId: string; registrationId: string; action: "APPROVE" | "CANCEL" | "CHECK_IN" | "UNDO_CHECK_IN"; adminEmail: string }): Promise<AdminRegistration>`
  - `VerificationRequestItem.awaitingPayment?: boolean`

- [ ] **Step 1: Write the failing test `tests/events/admin.test.ts`**

```ts
import { beforeEach, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { decideRegistration, getAdminEvent } from "@/lib/events/admin";
import { hasPendingMembershipPayment } from "@/lib/events/membership";
import { registerForEvent } from "@/lib/events/registrations";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

beforeEach(resetDatabase);

const join = async () => {
  const event = await makeEvent({ slug: "jubilee", isMembershipEvent: true, packages: [{ name: "General", price: 1000 }], paymentInstructions: "bKash 01XXXXXXXXX" });
  const { registration } = await registerForEvent({
    slug: "jubilee",
    sessionUserId: null,
    account: { fullName: "New Member", email: "new@example.test", password: "Member-Pw-2026", sscBatch: 2001 },
    rsvp: { packageName: "General", paymentMethod: "bKash", transactionId: "TRX123456", donationAmount: 250 },
  });
  return { event, registration };
};

it("approving a membership registration confirms payment and verifies the member", async () => {
  const { event, registration } = await join();
  const decided = await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "admin@example.test" });
  expect(decided).toMatchObject({ status: "CONFIRMED", confirmedBy: "admin@example.test", membershipStatus: "VERIFIED" });
  const user = await prisma.user.findUniqueOrThrow({ where: { email: "new@example.test" }, include: { profile: true, verificationRequests: true } });
  expect([user.status, user.profile?.verificationStatus, user.verificationRequests[0].status]).toEqual(["VERIFIED", "VERIFIED", "VERIFIED"]);
  expect(user.verificationRequests[0].reviewedBy).toBe("admin@example.test");
});

it("rejecting a new member's registration rejects the membership", async () => {
  const { event, registration } = await join();
  await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "CANCEL", adminEmail: "admin@example.test" });
  const user = await prisma.user.findUniqueOrThrow({ where: { email: "new@example.test" } });
  expect(user.status).toBe("REJECTED");
});

it("cancelling an already-verified member's registration keeps them verified", async () => {
  const event = await makeEvent({ slug: "jubilee", isMembershipEvent: true, packages: [{ name: "General", price: 1000 }], paymentInstructions: "x" });
  const member = await makeMember({ status: "VERIFIED" });
  const { registration } = await registerForEvent({ slug: "jubilee", sessionUserId: member.id, rsvp: { packageName: "General", paymentMethod: "Nagad", transactionId: "NGD1234567" } });
  await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "CANCEL", adminEmail: "a@x.test" });
  expect((await prisma.user.findUniqueOrThrow({ where: { id: member.id } })).status).toBe("VERIFIED");
});

it("only allows valid status changes", async () => {
  const { event, registration } = await join();
  const decide = (action: "APPROVE" | "CANCEL" | "CHECK_IN" | "UNDO_CHECK_IN") =>
    decideRegistration({ eventId: event.id, registrationId: registration.id, action, adminEmail: "a@x.test" });
  await expect(decide("CHECK_IN")).rejects.toMatchObject({ status: 409 }); // not paid yet
  await decide("APPROVE");
  await expect(decide("APPROVE")).rejects.toMatchObject({ status: 409 });
  expect((await decide("CHECK_IN")).status).toBe("CHECKED_IN");
  expect((await decide("UNDO_CHECK_IN")).status).toBe("CONFIRMED");
});

it("lists attendees with membership status and totals", async () => {
  const { event, registration } = await join();
  let admin = await getAdminEvent(event.id);
  expect(admin.registrations[0]).toMatchObject({ name: "New Member", membershipStatus: "PENDING", transactionId: "TRX123456", batch: 2001 });
  expect(admin.totals).toMatchObject({ pendingRevenue: 1250, confirmedRevenue: 0 });
  await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "a@x.test" });
  admin = await getAdminEvent(event.id);
  expect(admin.totals).toMatchObject({ confirmedRevenue: 1250, confirmedDonations: 250, headCount: 1 });
});

it("knows who is waiting for membership payment confirmation", async () => {
  await join();
  const user = await prisma.user.findUniqueOrThrow({ where: { email: "new@example.test" } });
  expect(await hasPendingMembershipPayment(prisma, user.id)).toBe(true);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- tests/events/admin.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `lib/events/membership.ts`**

```ts
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

/** True while the member's joining (membership event) payment is unconfirmed. */
export async function hasPendingMembershipPayment(
  db: Prisma.TransactionClient | typeof prisma,
  userId: string
): Promise<boolean> {
  const count = await db.eventRegistration.count({
    where: { userId, status: "PENDING_PAYMENT", event: { isMembershipEvent: true } },
  });
  return count > 0;
}
```

- [ ] **Step 4: Create `lib/events/admin.ts`**

```ts
import type { AlumniProfile, EventRegistration, User } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { getPublicEventBySlug } from "./service";
import type { AdminRegistration, PublicEvent, RegistrationStatusValue } from "./types";

type RegWithUser = EventRegistration & { user: User & { profile: AlumniProfile | null } };

function toAdminRegistration(reg: RegWithUser): AdminRegistration {
  return {
    id: reg.id,
    userId: reg.userId,
    name: reg.user.profile?.fullName ?? reg.user.email,
    email: reg.user.email,
    phone: reg.user.profile?.phone ?? "",
    batch: reg.user.profile?.sscBatch ?? null,
    rollNumber: reg.user.profile?.rollNumber ?? null,
    section: reg.user.profile?.section ?? null,
    membershipStatus: reg.user.status,
    packageName: reg.packageName,
    extraAdults: reg.extraAdults,
    extraChildren: reg.extraChildren,
    headCount: reg.headCount,
    totalFee: reg.totalFee,
    donationAmount: reg.donationAmount,
    tshirtSize: reg.tshirtSize,
    mealPreference: reg.mealPreference,
    paymentMethod: reg.paymentMethod,
    transactionId: reg.transactionId,
    status: reg.status,
    confirmedBy: reg.confirmedBy,
    confirmedAt: reg.confirmedAt?.toISOString() ?? null,
    checkedInAt: reg.checkedInAt?.toISOString() ?? null,
    createdAt: reg.createdAt.toISOString(),
  };
}

export async function getAdminEvent(id: string): Promise<{
  event: PublicEvent;
  registrations: AdminRegistration[];
  totals: { confirmedRevenue: number; pendingRevenue: number; confirmedDonations: number; headCount: number };
}> {
  const row = await prisma.event.findUnique({ where: { id }, select: { slug: true } });
  const event = row ? await getPublicEventBySlug(row.slug) : null;
  if (!event) throw new AppError("EVENT_NOT_FOUND", 404, "Event not found.");

  const regs = await prisma.eventRegistration.findMany({
    where: { eventId: id },
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
  });
  const registrations = regs.map(toAdminRegistration);
  const paid = (r: AdminRegistration) => r.totalFee + r.donationAmount;
  const attending = registrations.filter((r) => r.status === "CONFIRMED" || r.status === "CHECKED_IN");
  return {
    event,
    registrations,
    totals: {
      confirmedRevenue: attending.reduce((s, r) => s + paid(r), 0),
      confirmedDonations: attending.reduce((s, r) => s + r.donationAmount, 0),
      pendingRevenue: registrations.filter((r) => r.status === "PENDING_PAYMENT").reduce((s, r) => s + paid(r), 0),
      headCount: attending.reduce((s, r) => s + r.headCount, 0),
    },
  };
}

type Action = "APPROVE" | "CANCEL" | "CHECK_IN" | "UNDO_CHECK_IN";

const TRANSITIONS: Record<Action, { from: RegistrationStatusValue[]; to: RegistrationStatusValue }> = {
  APPROVE: { from: ["PENDING_PAYMENT"], to: "CONFIRMED" },
  CANCEL: { from: ["PENDING_PAYMENT", "CONFIRMED"], to: "CANCELLED" },
  CHECK_IN: { from: ["CONFIRMED"], to: "CHECKED_IN" },
  UNDO_CHECK_IN: { from: ["CHECKED_IN"], to: "CONFIRMED" },
};

/**
 * Admin decisions on a registration. On the membership event, APPROVE also
 * verifies the member and CANCEL rejects a member who is still PENDING, all in
 * one transaction; an already-verified member is never rejected.
 */
export async function decideRegistration(args: {
  eventId: string;
  registrationId: string;
  action: Action;
  adminEmail: string;
}): Promise<AdminRegistration> {
  const transition = TRANSITIONS[args.action];
  if (!transition) throw new AppError("INVALID_ACTION", 400, "Unknown action.");

  const updated = await prisma.$transaction(async (tx) => {
    const reg = await tx.eventRegistration.findUnique({ where: { id: args.registrationId }, include: { event: true, user: true } });
    if (!reg || reg.eventId !== args.eventId) throw new AppError("REGISTRATION_NOT_FOUND", 404, "Registration not found.");
    if (!transition.from.includes(reg.status)) {
      throw new AppError("INVALID_TRANSITION", 409, `This registration is ${reg.status.toLowerCase().replace("_", " ")}.`);
    }

    const now = new Date();
    await tx.eventRegistration.update({
      where: { id: reg.id },
      data: {
        status: transition.to,
        ...(args.action === "APPROVE" ? { confirmedBy: args.adminEmail, confirmedAt: now } : {}),
        ...(args.action === "CHECK_IN" ? { checkedInAt: now } : {}),
        ...(args.action === "UNDO_CHECK_IN" ? { checkedInAt: null } : {}),
      },
    });

    if (reg.event.isMembershipEvent) {
      const membership =
        args.action === "APPROVE" ? "VERIFIED" : args.action === "CANCEL" && reg.user.status === "PENDING" ? "REJECTED" : null;
      if (membership) {
        await tx.user.update({ where: { id: reg.userId }, data: { status: membership } });
        await tx.alumniProfile.updateMany({ where: { userId: reg.userId }, data: { verificationStatus: membership } });
        await tx.verificationRequest.updateMany({
          where: { userId: reg.userId, status: "PENDING" },
          data: { status: membership, reviewedBy: args.adminEmail },
        });
      }
    }

    return tx.eventRegistration.findUniqueOrThrow({
      where: { id: reg.id },
      include: { user: { include: { profile: true } } },
    });
  });
  return toAdminRegistration(updated);
}
```

- [ ] **Step 5: Routes**

Add to `app/api/admin/events/[id]/route.ts` (import `getAdminEvent` from `@/lib/events/admin`):

```ts
export async function GET(_req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) return forbidden();
  try {
    return NextResponse.json(await getAdminEvent((await params).id));
  } catch (err) {
    return errorResponse(err, "GET /api/admin/events/[id]");
  }
}
```

Create `app/api/admin/events/[id]/registrations/[regId]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { decideRegistration } from "@/lib/events/admin";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

const ACTIONS = ["APPROVE", "CANCEL", "CHECK_IN", "UNDO_CHECK_IN"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; regId: string }> }) {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) {
    return NextResponse.json({ error: "Only administrators can manage registrations." }, { status: 403 });
  }
  try {
    const { action } = await req.json();
    if (!ACTIONS.includes(action)) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    const { id, regId } = await params;
    return NextResponse.json({ registration: await decideRegistration({ eventId: id, registrationId: regId, action, adminEmail: me.email }) });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/events/[id]/registrations/[regId]");
  }
}
```

- [ ] **Step 6: Guard the verification queue**

In `app/api/admin/verifications/route.ts`:
1. Add `import { hasPendingMembershipPayment } from "@/lib/events/membership";`.
2. In `GET`, after `const requests = await prisma.verificationRequest.findMany(...)`, replace the success return with:

```ts
      const withPayment = await Promise.all(
        requests.map(async (r) => ({ ...r, awaitingPayment: await hasPendingMembershipPayment(prisma, r.userId) }))
      );
      return NextResponse.json({ requests: withPayment, total: withPayment.length });
```

3. In `PATCH`'s transaction, directly after the `request.status !== "PENDING"` check, add:

```ts
        // Joining is the paid Jubilee registration: approve it from the event's
        // attendee list, where the payment and the membership are decided together.
        if (await hasPendingMembershipPayment(tx, request.userId)) {
          return { error: "Confirm their Jubilee payment from the event's attendee list.", code: 409 } as const;
        }
```

In `lib/data.ts` add `awaitingPayment?: boolean;` to `VerificationRequestItem`. In `lib/admin-verifications.ts` add `awaitingPayment?: boolean;` to `VerificationRequestRow` and `awaitingPayment: row.awaitingPayment ?? false,` to the object returned by `toItem`.

- [ ] **Step 7: Run to verify, typecheck and lint**

Run: `npm test -- tests/events/admin.test.ts && npx tsc --noEmit -p . && npx eslint lib/events app/api/admin lib/admin-verifications.ts`
Expected: 6 passed; no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/events lib/data.ts lib/admin-verifications.ts app/api/admin tests/events/admin.test.ts
git commit -m "feat(events): approve membership registrations as one payment + verification step"
```

---

### Task 9: Ticket check-in at the gate

**Files:**
- Modify: `lib/events/tickets.ts` (add `checkInTicket`)
- Create: `app/api/events/verify-ticket/route.ts`
- Delete: `app/api/events/[id]/ticket/route.ts` (and the now-empty `app/api/events/[id]/` folder)
- Test: `tests/events/tickets.test.ts`

**Interfaces:**
- Produces: `checkInTicket(scan: string, staffEmail: string, now?: Date): Promise<CheckInResult>` where `CheckInResult = { ok: true; attendee: { name: string; batch: number | null }; eventTitle: string; packageName: string | null; headCount: number } | { ok: false; reason: "INVALID" | "PENDING_PAYMENT" | "CANCELLED" | "ALREADY_CHECKED_IN"; message: string }`.

- [ ] **Step 1: Write the failing test `tests/events/tickets.test.ts`**

```ts
import { beforeEach, expect, it } from "vitest";
import { createCardToken } from "@/lib/id-card";
import { registerForEvent } from "@/lib/events/registrations";
import { checkInTicket, ticketInfo, TICKET_QR_PREFIX } from "@/lib/events/tickets";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

beforeEach(resetDatabase);

async function confirmedTicket() {
  await makeEvent({ slug: "picnic" });
  const member = await makeMember();
  const { registration } = await registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} });
  return registration.ticket!.qrText;
}

it("checks a confirmed ticket in once", async () => {
  const qr = await confirmedTicket();
  expect(await checkInTicket(qr, "gate@example.test")).toMatchObject({ ok: true, eventTitle: expect.any(String), headCount: 1 });
  const again = await checkInTicket(qr, "gate@example.test");
  expect(again).toMatchObject({ ok: false, reason: "ALREADY_CHECKED_IN" });
  expect(again.ok ? "" : again.message).toMatch(/Already checked in at/);
});

it("refuses tickets whose payment is not confirmed", async () => {
  await makeEvent({ slug: "paid", registrationFee: 500, paymentInstructions: "bKash 01XXXXXXXXX" });
  const member = await makeMember();
  const { registration } = await registerForEvent({ slug: "paid", sessionUserId: member.id, rsvp: { paymentMethod: "bKash", transactionId: "TRXPAID001" } });
  expect(registration.ticket).toBeNull(); // pending registrations are not shown a ticket
  const { qrText } = await ticketInfo(registration.id); // and one issued anyway is refused at the gate
  expect(await checkInTicket(qrText, "g@x.test")).toMatchObject({ ok: false, reason: "PENDING_PAYMENT", message: "Payment not confirmed." });
});

it("refuses forged tickets and alumni cards", async () => {
  expect(await checkInTicket(`${TICKET_QR_PREFIX}not-a-ticket-at-all-xxxxxxxxxxxxxxxxxxxxxx`, "g@x.test")).toMatchObject({ ok: false, reason: "INVALID" });
  const card = createCardToken({ alumniId: "A", fullName: "B", sscBatch: 2000, membershipTier: "LIFETIME", issuedAt: Date.now() });
  expect(await checkInTicket(card, "g@x.test")).toMatchObject({ ok: false, reason: "INVALID" });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- tests/events/tickets.test.ts`
Expected: FAIL — `checkInTicket` is not exported.

- [ ] **Step 3: Add `checkInTicket` to `lib/events/tickets.ts`**

Add `import prisma from "@/lib/prisma";` at the top, then append:

```ts
export type CheckInResult =
  | { ok: true; attendee: { name: string; batch: number | null }; eventTitle: string; packageName: string | null; headCount: number }
  | { ok: false; reason: "INVALID" | "PENDING_PAYMENT" | "CANCELLED" | "ALREADY_CHECKED_IN"; message: string };

/** Checks a scanned ticket in exactly once; refuses anything not CONFIRMED. */
export async function checkInTicket(scan: string, staffEmail: string, now = new Date()): Promise<CheckInResult> {
  const registrationId = readTicketToken(scan);
  if (!registrationId) return { ok: false, reason: "INVALID", message: "This is not a valid event ticket." };

  return prisma.$transaction(async (tx) => {
    const reg = await tx.eventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: true, user: { include: { profile: true } } },
    });
    if (!reg) return { ok: false, reason: "INVALID", message: "This ticket's registration no longer exists." } as const;
    if (reg.status === "PENDING_PAYMENT") return { ok: false, reason: "PENDING_PAYMENT", message: "Payment not confirmed." } as const;
    if (reg.status === "CANCELLED") return { ok: false, reason: "CANCELLED", message: "Registration cancelled." } as const;
    if (reg.status === "CHECKED_IN") {
      const at = reg.checkedInAt?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });
      return { ok: false, reason: "ALREADY_CHECKED_IN", message: `Already checked in at ${at}.` } as const;
    }
    // Conditional update: two simultaneous scans cannot both succeed.
    const { count } = await tx.eventRegistration.updateMany({
      where: { id: reg.id, status: "CONFIRMED" },
      data: { status: "CHECKED_IN", checkedInAt: now, notes: reg.notes ? `${reg.notes}\nChecked in by ${staffEmail}` : `Checked in by ${staffEmail}` },
    });
    if (count === 0) return { ok: false, reason: "ALREADY_CHECKED_IN", message: "Already checked in." } as const;
    return {
      ok: true,
      attendee: { name: reg.user.profile?.fullName ?? reg.user.email, batch: reg.user.profile?.sscBatch ?? null },
      eventTitle: reg.event.title,
      packageName: reg.packageName,
      headCount: reg.headCount,
    } as const;
  });
}
```

- [ ] **Step 4: Route — create `app/api/events/verify-ticket/route.ts`, delete `app/api/events/[id]/ticket/`**

```ts
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { checkInTicket } from "@/lib/events/tickets";
import { getSessionUser } from "@/lib/session-user";

const GATE_ROLES = ["ADMIN", "SUPER_ADMIN", "MODERATOR"];

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me || !GATE_ROLES.includes(me.role)) {
    return NextResponse.json({ error: "Only gate staff can check tickets in." }, { status: 403 });
  }
  try {
    const { code } = await req.json();
    if (typeof code !== "string" || !code.trim()) return NextResponse.json({ error: "Scan a ticket first." }, { status: 400 });
    const result = await checkInTicket(code, me.email);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (err) {
    return errorResponse(err, "POST /api/events/verify-ticket");
  }
}
```

Run: `git rm -r "app/api/events/[id]"` (removes the old ticket route; its `route.ts` and `rsvp` were removed in Tasks 6–7).

- [ ] **Step 5: Run the whole suite, typecheck and lint**

Run: `npm test && npx tsc --noEmit -p . && npx eslint lib app/api`
Expected: all passed; no new lint errors.

- [ ] **Step 6: Commit**

```bash
git add lib/events/tickets.ts app/api/events tests/events/tickets.test.ts
git commit -m "feat(events): check event tickets in at the gate"
```

---

### Task 10: Seed the real events; migrate the local database

**Files:**
- Modify: `prisma/seed.ts` (events section), `docs/DATABASE_SETUP.md`

**Interfaces:**
- Consumes: `sampleEvents` (`lib/data.ts`), `normalizePackages`/`parseTaka` (Task 4).

- [ ] **Step 1: Replace the events section of `prisma/seed.ts`**

Replace the block that starts with the events array (`const events = [` … its `for (const ev of events)` upsert loop) with:

```ts
  // 5. Seed events from the site's event content. The Golden Jubilee is the membership
  // event: joining the association is its paid registration. Payment instructions are
  // left for an admin to fill in, so joining stays closed until they exist.
  console.log("Seeding Events...");
  const JUBILEE_ID = "evt-golden-jubilee-50";
  const packageHeads: Record<string, { adults: number; children: number; guestsFree?: boolean }> = {
    "General Alumnus Delegate": { adults: 1, children: 0 },
    "Alumnus + Spouse / Extra Guest": { adults: 2, children: 0 },
    "Family (Alumnus + Spouse + 1 Child < 12yr)": { adults: 2, children: 1 },
    "Golden Patron & Sponsor": { adults: 1, children: 0, guestsFree: true },
  };
  const slugFor = (e: (typeof sampleEvents)[number]) =>
    e.title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

  for (const e of sampleEvents) {
    const isJubilee = e.id === JUBILEE_ID;
    await prisma.event.upsert({
      where: { slug: slugFor(e) },
      update: {},
      create: {
        slug: slugFor(e),
        title: e.title,
        category: e.category,
        description: e.description,
        date: new Date(`${e.date}T09:00:00+06:00`),
        time: e.time,
        venue: e.venue,
        locationCity: e.locationCity,
        organizer: e.organizer,
        bannerImage: e.bannerImage,
        maxAttendees: e.maxAttendees,
        registrationFee: isJubilee ? 0 : parseTaka(e.registrationFee ?? 0) || 0,
        isRegistrationOpen: e.isRegistrationOpen,
        subtitle: e.subtitle ?? null,
        guestOfHonor: e.guestOfHonor ?? null,
        souvenirDetails: e.souvenirDetails ?? null,
        registrationDeadline: isJubilee ? new Date("2026-12-15T23:59:59+06:00") : null,
        isMegaEvent: e.isMegaEvent ?? false,
        isMembershipEvent: isJubilee,
        extraAdultFee: isJubilee ? 500 : 0,
        childFee: isJubilee ? 300 : 0,
        agenda: (e.agenda ?? []) as unknown as Prisma.InputJsonValue,
        highlights: e.highlights ?? [],
        packages: normalizePackages((e.packages ?? []).map((p) => ({ ...p, ...packageHeads[p.name] }))) as unknown as Prisma.InputJsonValue,
        paymentInstructions: null,
      },
    });
  }

  // Events written by earlier versions of this seed, removed if nobody registered.
  await prisma.event.deleteMany({
    where: {
      slug: { in: ["grand-alumni-reunion-2026", "inter-batch-football-carnival-2026", "tech-career-leadership-summit-2026"] },
      registrations: { none: {} },
    },
  });
```

Add to the imports at the top of `prisma/seed.ts`:

```ts
import type { Prisma } from "@prisma/client";
import { sampleEvents } from "../lib/data";
import { normalizePackages, parseTaka } from "../lib/events/pricing";
```

- [ ] **Step 2: Verify the seed against a scratch database**

Run (Docker test DB running): 
`DATABASE_URL=mysql://root:test@127.0.0.1:3307/sshs_test npx tsx -e "await import('./tests/setup/global-setup.ts').then(m=>m.default())"` then
`DATABASE_URL=mysql://root:test@127.0.0.1:3307/sshs_test SEED_ADMIN_PASSWORD=Scratch-Admin-Pw-1 SEED_ALUMNI_PASSWORD=Scratch-Alumni-Pw-1 npm run db:seed` twice.
Expected: both runs succeed; `SELECT COUNT(*) FROM Event` = 5; `SELECT slug FROM Event WHERE isMembershipEvent` = the Jubilee's slug.

- [ ] **Step 3: Document the migration in `docs/DATABASE_SETUP.md`**

Append a section:

```markdown
## Events & membership registration (Oct 2026)

`npm run db:push` adds event content (packages, agenda, fees, payment instructions, membership flag) and registration details; nothing is dropped. `npm run db:seed` then adds the site's 5 events, with the Golden Jubilee as the **membership event**.

Joining the association is the Jubilee registration. It stays closed ("Payment details coming soon") until an admin enters the Jubilee's **payment instructions** (bKash/Nagad number) in Admin → Events → Golden Jubilee → Pricing.
```

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts docs/DATABASE_SETUP.md
git commit -m "feat(seed): seed the site's events with the Golden Jubilee as the membership event"
```

---

### Task 11: Public event pages read the database

**Files:**
- Move: `app/events/[id]/` → `app/events/[slug]/` (`git mv`), then delete `app/events/[slug]/ticket/`
- Modify: `app/events/page.tsx`, `app/events/[slug]/page.tsx`, `components/events/EventCard.tsx`, `app/page.tsx`, `app/dashboard/page.tsx`, `app/sitemap.ts`, `components/shared/GlobalSearchModal.tsx`

**Interfaces:**
- Consumes: `GET /api/events`, `GET /api/events/[slug]`, `GET /api/events/[slug]/rsvp` (Tasks 6–7); `listPublicEvents` (server components).

- [ ] **Step 1: Move the route folder**

Run: `git mv "app/events/[id]" "app/events/[slug]" && git rm -r "app/events/[slug]/ticket"`

- [ ] **Step 2: `app/events/page.tsx` — load from the API**

Replace the imports of `sampleEvents` and `getStoredEvents` with `import type { EventItem } from "@/lib/data";`, and replace the `events` state and its `useEffect` with:

```tsx
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/events", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Events are unavailable right now.");
        setEvents(body.events);
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);
```

Change `const [loading, setLoading] = useState(false);` to `useState(true)`, and render `{loadError && <p role="alert" className="text-xs text-rose-700">{loadError}</p>}` directly above the events grid.

- [ ] **Step 3: `components/events/EventCard.tsx` — link by slug and show availability**

Change `href={`/events/${event.id}`}` to `href={`/events/${event.slug ?? event.id}`}`. Next to the attendee count, add:

```tsx
{event.closedMessage ? (
  <span className="text-[11px] font-bold text-rose-700">{event.closedMessage}</span>
) : typeof event.placesLeft === "number" ? (
  <span className="text-[11px] font-semibold text-emerald-700">{event.placesLeft} places left</span>
) : null}
```

- [ ] **Step 4: `app/events/[slug]/page.tsx` — the event and the member's registration from the API**

Change the props type to `params: Promise<{ slug: string }>`, remove the `sampleEvents` and `getStoredEventById` imports, add `import type { PublicEvent, MemberRegistration } from "@/lib/events/types";`, and replace the outer `EventDetailPage` component (the one resolving the event before rendering `EventDetailView`) with:

```tsx
export default function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = use(params);
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [registration, setRegistration] = useState<MemberRegistration | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${slug}`, { cache: "no-store" }).then(async (res) => {
      if (res.status === 404) return setMissing(true);
      setEvent((await res.json()).event);
    });
    fetch(`/api/events/${slug}/rsvp`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { registration: null }))
      .then((body) => setRegistration(body.registration));
  }, [slug]);

  if (missing) notFound();
  if (!event) {
    return (
      <div role="status" className="min-h-screen flex items-center justify-center text-xs text-slate-500">
        Loading event…
      </div>
    );
  }
  return <EventDetailView event={event} registration={registration} onRegistered={setRegistration} />;
}
```

In `EventDetailView`, change the signature to
`function EventDetailView({ event, registration, onRegistered }: { event: PublicEvent; registration: MemberRegistration | null; onRegistered: (r: MemberRegistration) => void })`,
delete `const [registered, setRegistered] = useState(false);`, add `const registered = registration !== null;`, and replace the `<RSVPModal … />` element at the end with:

```tsx
      <RSVPModal
        event={event}
        isOpen={rsvpOpen}
        onClose={() => setRsvpOpen(false)}
        initialPackage={selectedPackage}
        onRegistered={(r) => {
          onRegistered(r);
          setRsvpOpen(false);
        }}
      />
```

Where the page shows the "registered" state, show the real status and ticket:

```tsx
{registration && (
  <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs space-y-2">
    <p className="font-bold text-emerald-900">
      {registration.status === "PENDING_PAYMENT"
        ? "Registered — payment and membership under review"
        : registration.status === "CANCELLED"
          ? "Your registration was cancelled"
          : "You're registered"}
    </p>
    {registration.ticket && (
      <img src={registration.ticket.qrDataUrl} alt="Event ticket QR code" className="w-40 h-40 bg-white rounded-xl border" />
    )}
  </div>
)}
```

Replace every `event.id === "evt-golden-jubilee-50"` check with `event.isMegaEvent`. Where the page shows `event.attendeesCount`, keep it (it is now the live count); where it shows `isRegistrationOpen` off, show `event.closedMessage`.

- [ ] **Step 5: Home page (server component) — `app/page.tsx`**

Make the component `async`, import `import { listPublicEvents } from "@/lib/events/service";`, and replace `const upcomingEvents = sampleEvents.slice(0, 3);` with:

```tsx
  const today = new Date().toISOString().slice(0, 10);
  const upcomingEvents = (await listPublicEvents().catch(() => [])).filter((e) => e.date >= today).slice(0, 3);
```

Add `export const dynamic = "force-dynamic";` below the imports, remove `sampleEvents` from the `@/lib/data` import, and change any `/events/${evt.id}` link to `/events/${evt.slug}`.

- [ ] **Step 6: Dashboard — `app/dashboard/page.tsx`**

Replace `const upcomingEvent = sampleEvents[0];` with:

```tsx
  const [upcomingEvent, setUpcomingEvent] = useState<EventItem | null>(null);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch("/api/events", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { events: [] }))
      .then((body: { events: EventItem[] }) => setUpcomingEvent(body.events.find((e) => e.date >= today) ?? null));
  }, []);
```

(import `useEffect`, `type EventItem`; remove `sampleEvents`), and wrap the upcoming-event card JSX (the element that renders `upcomingEvent.bannerImage`) in `{upcomingEvent && ( … )}`, linking to `/events/${upcomingEvent.slug}`.

- [ ] **Step 7: Sitemap — `app/sitemap.ts`**

Make the default export `async`, import `listPublicEvents`, and replace the `eventPages` mapping with:

```ts
  const eventPages = (await listPublicEvents().catch(() => [])).map((e) => ({
    url: `${baseUrl}/events/${e.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
```

- [ ] **Step 8: Search — `components/shared/GlobalSearchModal.tsx`**

Remove `sampleEvents` from the import, add state loaded once when the modal opens:

```tsx
  const [events, setEvents] = useState<EventItem[]>([]);
  useEffect(() => {
    if (!isOpen || events.length > 0) return;
    fetch("/api/events").then((res) => (res.ok ? res.json() : { events: [] })).then((b) => setEvents(b.events));
  }, [isOpen, events.length]);
```

(use the modal's existing open prop name), filter `events` instead of `sampleEvents`, and link results to `/events/${e.slug}`.

- [ ] **Step 9: Verify in the browser**

Run: `npm run build` then start against a seeded local database (Task 10 Step 2) and open `/events`, a Jubilee page `/events/<jubilee-slug>`, `/events/evt-1` (expect 404), and the home page.
Expected: 5 real events with "places left"/"Payment details coming soon"; the Jubilee layout renders; old ids 404; no console errors.

- [ ] **Step 10: Commit**

```bash
git add -A app/events app/page.tsx app/dashboard/page.tsx app/sitemap.ts components/events/EventCard.tsx components/shared/GlobalSearchModal.tsx
git commit -m "feat(events): public event pages read events from the database"
```

---

### Task 12: Combined registration form (RSVP modal and /register)

**Files:**
- Create: `components/events/RegistrationForm.tsx`
- Modify: `components/events/RSVPModal.tsx` (whole file), `app/register/page.tsx` (whole file), `app/login/page.tsx` (register link text only)

**Interfaces:**
- Consumes: `PublicEvent`, `MemberRegistration`, `computeFee` (client-safe: `lib/events/pricing.ts` has no server imports), `POST /api/events/[slug]/rsvp`, `GET /api/events/membership`.
- Produces: `<RegistrationForm event={PublicEvent} initialPackage?: string onRegistered={(r: MemberRegistration) => void} />`; `<RSVPModal event isOpen onClose initialPackage? onRegistered />`.

- [ ] **Step 1: Create `components/events/RegistrationForm.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { computeFee, formatTaka, normalizePackages } from "@/lib/events/pricing";
import type { MemberRegistration, PublicEvent } from "@/lib/events/types";

const FIRST_SSC_BATCH = 1985;
const BATCH_YEARS = Array.from({ length: new Date().getFullYear() - FIRST_SSC_BATCH + 1 }, (_, i) => new Date().getFullYear() - i);
const PAYMENT_METHODS = ["bKash", "Nagad", "Bank", "Cash"];
const input = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600";
const label = "block text-xs font-semibold text-slate-700 mb-1";

/**
 * One form for joining (membership event, signed out: account + registration) and
 * for registering signed-in members. The live total uses the same rules as the server,
 * which recalculates it and is the only source of truth.
 */
export default function RegistrationForm({
  event,
  initialPackage,
  onRegistered,
}: {
  event: PublicEvent;
  initialPackage?: string;
  onRegistered: (registration: MemberRegistration) => void;
}) {
  const { status: sessionStatus } = useSession();
  const needsAccount = sessionStatus === "unauthenticated" && event.isMembershipEvent;
  // Step 1 (account details) only exists for signed-out visitors joining. The session
  // is still "loading" on the first render, so derive what to show on every render.
  const [step, setStep] = useState<1 | 2>(1);
  const showAccount = needsAccount && step === 1;
  const showRegistration = !needsAccount || step === 2;

  const [account, setAccount] = useState({ fullName: "", email: "", phone: "", password: "", sscBatch: "2010", rollNumber: "", section: "" });
  const [packageName, setPackageName] = useState(initialPackage ?? event.packages[0]?.name ?? "");
  const [extraAdults, setExtraAdults] = useState(0);
  const [extraChildren, setExtraChildren] = useState(0);
  const [tshirtSize, setTshirtSize] = useState("L");
  const [mealPreference, setMealPreference] = useState("");
  const [donation, setDonation] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bKash");
  const [transactionId, setTransactionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [existingAccount, setExistingAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (sessionStatus === "loading") {
    return <p role="status" className="text-xs text-slate-500">Loading…</p>;
  }
  if (sessionStatus === "unauthenticated" && !event.isMembershipEvent) {
    return (
      <p className="text-xs text-slate-600">
        This event is for verified members. <Link href={`/login?callbackUrl=/events/${event.slug}`} className="font-bold text-emerald-800 underline">Sign in</Link> or{" "}
        <Link href="/register" className="font-bold text-emerald-800 underline">join the association</Link>.
      </p>
    );
  }
  if (!event.isRegistrationOpen) {
    return <p role="status" className="text-xs font-bold text-rose-700">{event.closedMessage}</p>;
  }

  let total: { fee: number; donation: number; total: number; headCount: number } | null = null;
  try {
    total = computeFee(
      { registrationFee: event.registrationFeeAmount, extraAdultFee: event.extraAdultFee, childFee: event.childFee, packages: normalizePackages(event.packages.map((p) => ({ ...p, price: p.priceAmount }))) },
      { packageName, extraAdults, extraChildren, donationAmount: donation ? Number(donation) : 0 }
    );
  } catch {
    total = null;
  }
  const paid = (total?.total ?? 0) > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExistingAccount(false);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${event.slug}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: needsAccount ? { ...account, sscBatch: Number(account.sscBatch) } : undefined,
          rsvp: {
            packageName: event.packages.length ? packageName : null,
            extraAdults,
            extraChildren,
            tshirtSize,
            mealPreference: mealPreference || null,
            donationAmount: donation ? Number(donation) : 0,
            paymentMethod: paid ? paymentMethod : null,
            transactionId: paid ? transactionId : null,
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.code === "EMAIL_EXISTS") setExistingAccount(true);
        throw new Error(body.error || "Registration failed. Please try again.");
      }
      if (body.createdAccount) {
        // Sign the new member in with the password they just chose.
        await signIn("credentials", { redirect: false, email: body.createdAccount.email, password: account.password });
      }
      onRegistered(body.registration);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {needsAccount && (
        <div className="flex gap-2 text-[11px] font-bold">
          <span className={step === 1 ? "text-emerald-800" : "text-slate-400"}>1. Your details</span>
          <span className="text-slate-300">/</span>
          <span className={step === 2 ? "text-emerald-800" : "text-slate-400"}>2. Registration &amp; payment</span>
        </div>
      )}

      {showAccount && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="reg-name" className={label}>Full name *</label>
            <input id="reg-name" required className={input} value={account.fullName} onChange={(e) => setAccount({ ...account, fullName: e.target.value })} />
          </div>
          <div>
            <label htmlFor="reg-email" className={label}>Email *</label>
            <input id="reg-email" type="email" required className={input} value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
          </div>
          <div>
            <label htmlFor="reg-phone" className={label}>Phone *</label>
            <input id="reg-phone" required className={input} value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} />
          </div>
          <div>
            <label htmlFor="reg-password" className={label}>Password (8+ characters) *</label>
            <input id="reg-password" type="password" minLength={8} required autoComplete="new-password" className={input} value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />
          </div>
          <div>
            <label htmlFor="reg-batch" className={label}>SSC batch *</label>
            <select id="reg-batch" className={input} value={account.sscBatch} onChange={(e) => setAccount({ ...account, sscBatch: e.target.value })}>
              {BATCH_YEARS.map((y) => <option key={y} value={y}>SSC Batch {y}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="reg-roll" className={label}>Roll number</label>
            <input id="reg-roll" className={input} value={account.rollNumber} onChange={(e) => setAccount({ ...account, rollNumber: e.target.value })} />
          </div>
          <div>
            <label htmlFor="reg-section" className={label}>Section</label>
            <select id="reg-section" className={input} value={account.section} onChange={(e) => setAccount({ ...account, section: e.target.value })}>
              <option value="">—</option>
              <option value="A">Section A (Morning)</option>
              <option value="B">Section B (Day)</option>
              <option value="Science">Science Cohort</option>
              <option value="Commerce">Commerce / Arts</option>
            </select>
          </div>
          <button
            type="button"
            className="sm:col-span-2 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold"
            onClick={(e) => {
              const form = (e.currentTarget as HTMLButtonElement).form!;
              if (form.reportValidity()) setStep(2);
            }}
          >
            Continue to registration &amp; payment
          </button>
        </div>
      )}

      {showRegistration && (
        <div className="space-y-3">
          {event.packages.length > 0 && (
            <div>
              <label htmlFor="reg-package" className={label}>Package *</label>
              <select id="reg-package" className={input} value={packageName} onChange={(e) => setPackageName(e.target.value)}>
                {event.packages.map((p) => <option key={p.name} value={p.name}>{p.name} — {p.price}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-adults" className={label}>Extra adults{event.extraAdultFee ? ` (+${formatTaka(event.extraAdultFee)} each)` : ""}</label>
              <input id="reg-adults" type="number" min={0} max={10} className={input} value={extraAdults} onChange={(e) => setExtraAdults(Math.max(0, Math.min(10, Number(e.target.value) || 0)))} />
            </div>
            <div>
              <label htmlFor="reg-children" className={label}>Children under 12{event.childFee ? ` (+${formatTaka(event.childFee)} each)` : ""}</label>
              <input id="reg-children" type="number" min={0} max={10} className={input} value={extraChildren} onChange={(e) => setExtraChildren(Math.max(0, Math.min(10, Number(e.target.value) || 0)))} />
            </div>
            <div>
              <label htmlFor="reg-tshirt" className={label}>T-shirt size</label>
              <select id="reg-tshirt" className={input} value={tshirtSize} onChange={(e) => setTshirtSize(e.target.value)}>
                {["S", "M", "L", "XL", "XXL"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="reg-meal" className={label}>Meal preference</label>
              <input id="reg-meal" className={input} value={mealPreference} onChange={(e) => setMealPreference(e.target.value)} placeholder="e.g. Vegetarian" />
            </div>
          </div>
          <div>
            <label htmlFor="reg-donation" className={label}>Additional donation (optional, ৳)</label>
            <input id="reg-donation" type="number" min={0} step={1} className={input} value={donation} onChange={(e) => setDonation(e.target.value)} placeholder="Any amount you'd like to give" />
          </div>

          {total && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between"><span>Registration</span><strong>{formatTaka(total.fee)}</strong></div>
              {total.donation > 0 && <div className="flex justify-between"><span>Donation</span><strong>{formatTaka(total.donation)}</strong></div>}
              <div className="flex justify-between text-sm"><span className="font-bold">Total to pay</span><strong>{formatTaka(total.total)}</strong></div>
              <div className="text-slate-500">{total.headCount} {total.headCount === 1 ? "person" : "people"}</div>
            </div>
          )}

          {paid && (
            <div className="space-y-3">
              <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 whitespace-pre-line">{event.paymentInstructions}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-method" className={label}>Paid with *</label>
                  <select id="reg-method" className={input} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="reg-trx" className={label}>Transaction ID *</label>
                  <input id="reg-trx" required className={input} value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="e.g. 9AB3XK1LQ" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs font-bold text-rose-700">
              {error}{" "}
              {existingAccount && <Link href={`/login?callbackUrl=/events/${event.slug}`} className="underline">Sign in</Link>}
            </p>
          )}

          <div className="flex gap-2">
            {needsAccount && (
              <button type="button" onClick={() => setStep(1)} className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Back</button>
            )}
            <button type="submit" disabled={submitting || !total} className="flex-1 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50">
              {submitting ? "Submitting…" : event.isMembershipEvent && needsAccount ? "Join & register" : "Register"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Replace `components/events/RSVPModal.tsx`**

```tsx
"use client";

import React from "react";
import { X } from "lucide-react";
import RegistrationForm from "./RegistrationForm";
import type { MemberRegistration, PublicEvent } from "@/lib/events/types";

export default function RSVPModal({
  event,
  isOpen,
  onClose,
  initialPackage,
  onRegistered,
}: {
  event: PublicEvent;
  isOpen: boolean;
  onClose: () => void;
  initialPackage?: string;
  onRegistered: (registration: MemberRegistration) => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Register for ${event.title}`}>
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              {event.isMembershipEvent ? "Join the association" : "Event registration"}
            </p>
            <h2 className="text-base font-extrabold text-slate-900">{event.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <RegistrationForm event={event} initialPackage={initialPackage} onRegistered={onRegistered} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace `app/register/page.tsx`**

```tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RegistrationForm from "@/components/events/RegistrationForm";
import type { PublicEvent } from "@/lib/events/types";

// Joining the association is the membership event's (Golden Jubilee's) paid registration.
export default function RegisterPage() {
  const router = useRouter();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/events/membership", { cache: "no-store" }).then(async (res) => {
      const body = await res.json();
      if (!res.ok) return setMessage(body.error || "Membership registration opens soon.");
      setEvent(body.event);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-8 space-y-4">
        <h1 className="text-2xl font-extrabold text-slate-900">Join the SSGHS Alumni Association</h1>
        {event && (
          <p className="text-sm text-slate-600">
            Membership is through the <strong>{event.title}</strong> registration. Fill in your details, pay, and enter your
            transaction ID; the committee confirms your payment and verifies your membership together.
          </p>
        )}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
          {!message && !event && <p role="status" className="text-xs text-slate-500">Loading…</p>}
          {event && <RegistrationForm event={event} onRegistered={() => router.push("/dashboard")} />}
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 4: Verify in the browser (seeded DB with Jubilee payment instructions set via SQL)**

Run: `UPDATE Event SET paymentInstructions='Send to bKash 01XXXXXXXXX (test)' WHERE isMembershipEvent=1;` on the local DB, build, start, then as a signed-out visitor open `/register`, fill step 1, step 2 with package + extra adult + donation 500 + TrxID, submit.
Expected: live total ৳1,500 + ৳500 donation = ৳2,000; after submit you are signed in and see the dashboard; DB has a `PENDING` user and a `PENDING_PAYMENT` registration with `totalFee=1500`, `donationAmount=500`. Submitting again with the same email → "You already have an account — sign in to register" with a Sign in link. Check at 375px width: no horizontal scroll.

- [ ] **Step 5: Commit**

```bash
git add components/events/RegistrationForm.tsx components/events/RSVPModal.tsx app/register/page.tsx
git commit -m "feat(events): one form to join the association and register for the Jubilee"
```

---

### Task 13: "My Events" on the dashboard

**Files:**
- Create: `components/events/MyEvents.tsx`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `GET /api/me/registrations` (Task 7).

- [ ] **Step 1: Create `components/events/MyEvents.tsx`**

```tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { MemberRegistration } from "@/lib/events/types";
import { formatTaka } from "@/lib/events/pricing";

const STATUS_TEXT: Record<MemberRegistration["status"], string> = {
  PENDING_PAYMENT: "Pending — payment under review",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  CANCELLED: "Cancelled",
};

export default function MyEvents() {
  const [registrations, setRegistrations] = useState<MemberRegistration[] | null>(null);
  const [openTicket, setOpenTicket] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/registrations", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { registrations: [] }))
      .then((body) => setRegistrations(body.registrations));
  }, []);

  if (!registrations || registrations.length === 0) return null;
  return (
    <section className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
      <h3 className="font-bold text-sm text-slate-900">My Events</h3>
      <ul className="space-y-3">
        {registrations.map((r) => (
          <li key={r.id} className="text-xs border-t border-slate-100 pt-3 first:border-0 first:pt-0 space-y-1">
            <Link href={`/events/${r.eventSlug}`} className="font-bold text-slate-900 hover:underline">{r.eventTitle}</Link>
            <div className="text-slate-500">
              {r.eventDate} · {r.headCount} {r.headCount === 1 ? "person" : "people"} · {formatTaka(r.totalFee + r.donationAmount)}
            </div>
            <div className={r.status === "PENDING_PAYMENT" ? "text-amber-700 font-semibold" : r.status === "CANCELLED" ? "text-rose-700 font-semibold" : "text-emerald-700 font-semibold"}>
              {STATUS_TEXT[r.status]}
            </div>
            {r.ticket && (
              <button type="button" onClick={() => setOpenTicket(openTicket === r.id ? null : r.id)} className="text-emerald-800 font-bold underline">
                {openTicket === r.id ? "Hide ticket" : "Show ticket"}
              </button>
            )}
            {r.ticket && openTicket === r.id && (
              <img src={r.ticket.qrDataUrl} alt={`Ticket for ${r.eventTitle}`} className="w-44 h-44 bg-white border rounded-xl" />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Render it on the dashboard**

In `app/dashboard/page.tsx` import `MyEvents` and render `<MyEvents />` directly above the upcoming-event card.

- [ ] **Step 3: Verify in the browser**

As the member from Task 12: dashboard shows "My Events" with "Pending — payment under review" and no ticket button.

- [ ] **Step 4: Commit**

```bash
git add components/events/MyEvents.tsx app/dashboard/page.tsx
git commit -m "feat(events): show members their registrations and tickets"
```

---

### Task 14: Admin event pages use the API

**Files:**
- Modify: `app/admin/events/page.tsx`, `app/admin/events/[id]/page.tsx`, `app/admin/page.tsx`, `app/admin/alumni/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/admin/events`, `GET/PUT/DELETE /api/admin/events/[id]`, `PATCH /api/admin/events/[id]/registrations/[regId]` (Tasks 6, 8); `AdminRegistration`.

- [ ] **Step 1: Events manager list — `app/admin/events/page.tsx`**

Remove the `lib/events-service` import. Replace the initial load with:

```tsx
  const load = () =>
    fetch("/api/admin/events", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        setEvents(body.events);
      })
      .catch((err: Error) => showToast(err.message));

  useEffect(() => {
    load();
  }, []);
```

Replace `handleSave` and `handleDelete` with:

```tsx
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      title: formData.title,
      subtitle: formData.subtitle,
      category: formData.category,
      date: formData.date,
      time: formData.time,
      locationCity: formData.locationCity,
      venue: formData.venue,
      organizer: formData.organizer,
      registrationFee: formData.registrationFee,
      maxAttendees: Number(formData.maxAttendees),
      registrationDeadline: formData.registrationDeadline || null,
      bannerImage: formData.bannerImage,
      description: formData.description,
      isRegistrationOpen: formData.isRegistrationOpen,
    };
    const res = await fetch(editingEvent ? `/api/admin/events/${editingEvent.id}` : "/api/admin/events", {
      method: editingEvent ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (!res.ok) return showToast(result.error || "Could not save the event.");
    showToast(editingEvent ? `Event "${formData.title}" updated.` : `Event "${formData.title}" created.`);
    setIsModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    const result = await res.json();
    setDeleteConfirmId(null);
    if (!res.ok) return showToast(result.error || "Could not delete the event.");
    showToast("Event deleted.");
    load();
  };
```

Remove the `attendeesCount` input from the form and from `initialFormState` (the count is live now). Admin links to an event's studio use `/admin/events/${evt.id}`; public links use `/events/${evt.slug}`.

- [ ] **Step 2: Event studio — `app/admin/events/[id]/page.tsx`: data layer**

Replace the `lib/data` and `lib/events-service` imports with:

```tsx
import type { AdminRegistration, PublicEvent, PublicPackage, AgendaEntry } from "@/lib/events/types";
import { formatTaka } from "@/lib/events/pricing";
```

Replace lines 66-278 (from `const [event, setEvent]` through the KPI calculations) with:

```tsx
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [attendees, setAttendees] = useState<AdminRegistration[]>([]);
  const [totals, setTotals] = useState({ confirmedRevenue: 0, pendingRevenue: 0, confirmedDonations: 0, headCount: 0 });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [attendeeStatusFilter, setAttendeeStatusFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newPkg, setNewPkg] = useState<PublicPackage>({
    name: "", price: "৳1,000", priceAmount: 1000, description: "", includes: [], isPopular: false, adults: 1, children: 0, guestsFree: false,
  });
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  const [newAgenda, setNewAgenda] = useState<AgendaEntry>({ time: "Day 1 - 09:00 AM", activity: "" });
  const [isAddingAgenda, setIsAddingAgenda] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const load = async () => {
    const res = await fetch(`/api/admin/events/${resolvedParams.id}`, { cache: "no-store" });
    const body = await res.json();
    if (res.status === 404) return router.push("/admin/events");
    if (!res.ok) return showToast(body.error || "Could not load the event.");
    setEvent(body.event);
    setAttendees(body.registrations);
    setTotals(body.totals);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id]);

  if (!event) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading Event Management Studio...
      </div>
    );
  }

  /** Saves the given fields (or the whole editable event) through the API. */
  const save = async (changes: Partial<PublicEvent> & Record<string, unknown>, message: string) => {
    const merged = { ...event, ...changes };
    const res = await fetch(`/api/admin/events/${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: merged.title, subtitle: merged.subtitle, category: merged.category, date: merged.date, time: merged.time,
        venue: merged.venue, locationCity: merged.locationCity, organizer: merged.organizer, bannerImage: merged.bannerImage,
        description: merged.description, maxAttendees: merged.maxAttendees, isRegistrationOpen: merged.isRegistrationOpen,
        registrationDeadline: merged.registrationDeadline || null, guestOfHonor: merged.guestOfHonor, souvenirDetails: merged.souvenirDetails,
        isMegaEvent: merged.isMegaEvent, isMembershipEvent: merged.isMembershipEvent, registrationFee: merged.registrationFeeAmount,
        extraAdultFee: merged.extraAdultFee, childFee: merged.childFee, paymentInstructions: merged.paymentInstructions,
        highlights: merged.highlights, agenda: merged.agenda,
        packages: merged.packages.map((p) => ({ ...p, price: p.priceAmount })),
      }),
    });
    const body = await res.json();
    if (!res.ok) return showToast(body.error || "Could not save.");
    setEvent(body.event);
    showToast(message);
  };

  const handleSaveAll = () => save({}, `All updates for "${event.title}" saved.`);

  const handleAddPackage = () => {
    if (!newPkg.name.trim()) return;
    const priceAmount = Number(String(newPkg.price).replace(/[^\d.]/g, "")) || 0;
    save({ packages: [...event.packages, { ...newPkg, priceAmount, price: formatTaka(priceAmount) }] }, `Package "${newPkg.name}" added.`);
    setIsAddingPackage(false);
    setNewPkg({ name: "", price: "৳1,000", priceAmount: 1000, description: "", includes: [], isPopular: false, adults: 1, children: 0, guestsFree: false });
  };

  const handleDeletePackage = (pkgName: string) =>
    save({ packages: event.packages.filter((p) => p.name !== pkgName) }, `Package "${pkgName}" removed.`);

  const handleAddAgenda = () => {
    if (!newAgenda.activity.trim()) return;
    save({ agenda: [...(event.agenda ?? []), newAgenda] }, "Agenda session added.");
    setIsAddingAgenda(false);
    setNewAgenda({ time: "Day 1 - 09:00 AM", activity: "" });
  };

  const handleDeleteAgenda = (idx: number) =>
    save({ agenda: (event.agenda ?? []).filter((_, i) => i !== idx) }, "Agenda session removed.");

  const decide = async (a: AdminRegistration, action: "APPROVE" | "CANCEL" | "CHECK_IN" | "UNDO_CHECK_IN") => {
    setBusyId(a.id);
    const res = await fetch(`/api/admin/events/${event.id}/registrations/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = await res.json();
    setBusyId(null);
    if (!res.ok) return showToast(body.error || "Could not update the registration.");
    showToast(`${a.name}: ${body.registration.status.replace("_", " ").toLowerCase()}`);
    load();
  };

  const handleExportCSV = () => {
    const header = "Name,Batch,Roll,Section,Email,Phone,Package,Head_Count,Fee_BDT,Donation_BDT,Payment_Method,Trx_ID,Status,Membership,Registered_At\n";
    const rows = attendees
      .map((a) => [a.name, a.batch ?? "", a.rollNumber ?? "", a.section ?? "", a.email, a.phone, a.packageName ?? "", a.headCount, a.totalFee, a.donationAmount, a.paymentMethod ?? "", a.transactionId ?? "", a.status, a.membershipStatus, a.createdAt]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + rows], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, "_")}_Registrations.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredAttendees = attendees.filter((a) => {
    if (attendeeStatusFilter !== "ALL" && a.status !== attendeeStatusFilter) return false;
    const q = attendeeSearch.trim().toLowerCase();
    return !q || [a.name, a.email, a.phone, String(a.batch ?? ""), a.transactionId ?? ""].some((v) => v.toLowerCase().includes(q));
  });
  const checkedInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;
```

- [ ] **Step 3: Event studio — pricing tab fields**

Immediately inside `{activeTab === "pricing" && (` … the first `<div className="bg-white …">`, after the header block, insert:

```tsx
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <label className="font-bold text-slate-700">
              Extra adult fee (৳)
              <input type="number" min={0} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl" value={event.extraAdultFee}
                onChange={(e) => setEvent({ ...event, extraAdultFee: Number(e.target.value) || 0 })} />
            </label>
            <label className="font-bold text-slate-700">
              Child fee, under 12 (৳)
              <input type="number" min={0} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl" value={event.childFee}
                onChange={(e) => setEvent({ ...event, childFee: Number(e.target.value) || 0 })} />
            </label>
            <label className="font-bold text-slate-700 flex items-center gap-2 sm:mt-5">
              <input type="checkbox" checked={event.isMembershipEvent}
                onChange={(e) => setEvent({ ...event, isMembershipEvent: e.target.checked })} />
              Membership event (joining = this registration)
            </label>
            <label className="sm:col-span-3 font-bold text-slate-700">
              Payment instructions (shown to registrants; required for paid events)
              <textarea rows={2} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl font-normal"
                placeholder="Send to bKash 01XXXXXXXXX (Merchant), then enter your TrxID"
                value={event.paymentInstructions ?? ""} onChange={(e) => setEvent({ ...event, paymentInstructions: e.target.value })} />
            </label>
          </div>
```

In the add-package form, after the Price input's closing `</div>` (the block with `value={newPkg.price}`), insert:

```tsx
                <div className="grid grid-cols-3 gap-2">
                  <label className="font-bold text-slate-700">Adults incl.
                    <input type="number" min={1} className="w-full px-3 py-2 border border-slate-300 rounded-xl" value={newPkg.adults}
                      onChange={(e) => setNewPkg({ ...newPkg, adults: Math.max(1, Number(e.target.value) || 1) })} />
                  </label>
                  <label className="font-bold text-slate-700">Children incl.
                    <input type="number" min={0} className="w-full px-3 py-2 border border-slate-300 rounded-xl" value={newPkg.children}
                      onChange={(e) => setNewPkg({ ...newPkg, children: Math.max(0, Number(e.target.value) || 0) })} />
                  </label>
                  <label className="font-bold text-slate-700 flex items-center gap-1 mt-5">
                    <input type="checkbox" checked={newPkg.guestsFree} onChange={(e) => setNewPkg({ ...newPkg, guestsFree: e.target.checked })} />
                    Extra guests free
                  </label>
                </div>
```

The pricing tab's "Save" button (if any) and the page's "Save all" call `handleSaveAll`.

- [ ] **Step 4: Event studio — attendees tab and manual registration**

Delete the "Register Attendee Manually" button and the whole `{/* Manual Registration Modal */}` block (`{isManualModalOpen && ( … )}`): every registration now belongs to a member account. Replace the attendee table body rows with:

```tsx
{filteredAttendees.map((a) => (
  <tr key={a.id} className="border-t border-slate-100 text-xs">
    <td className="py-3 px-3">
      <div className="font-bold text-slate-900">{a.name}</div>
      <div className="text-slate-500">{a.email} · {a.phone}</div>
    </td>
    <td className="py-3 px-3">
      SSC {a.batch ?? "—"}{a.rollNumber ? ` · Roll ${a.rollNumber}` : ""}{a.section ? ` · ${a.section}` : ""}
      <div className={a.membershipStatus === "VERIFIED" ? "text-emerald-700" : a.membershipStatus === "REJECTED" ? "text-rose-700" : "text-amber-700"}>
        Membership: {a.membershipStatus.toLowerCase()}
      </div>
    </td>
    <td className="py-3 px-3">{a.packageName ?? "—"} · {a.headCount} {a.headCount === 1 ? "person" : "people"}</td>
    <td className="py-3 px-3">
      {formatTaka(a.totalFee)}{a.donationAmount > 0 && <> + {formatTaka(a.donationAmount)} donation</>}
      <div className="text-slate-500 font-mono">{a.paymentMethod ?? "—"} {a.transactionId ?? ""}</div>
    </td>
    <td className="py-3 px-3 font-bold">{a.status.replace("_", " ")}</td>
    <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
      {a.status === "PENDING_PAYMENT" && (
        <button disabled={busyId === a.id} onClick={() => decide(a, "APPROVE")} className="px-2.5 py-1 rounded-lg bg-emerald-800 text-white font-bold disabled:opacity-50">
          {event.isMembershipEvent ? "Approve (payment + membership)" : "Confirm payment"}
        </button>
      )}
      {a.status === "CONFIRMED" && (
        <button disabled={busyId === a.id} onClick={() => decide(a, "CHECK_IN")} className="px-2.5 py-1 rounded-lg bg-slate-800 text-white font-bold disabled:opacity-50">Check in</button>
      )}
      {a.status === "CHECKED_IN" && (
        <button disabled={busyId === a.id} onClick={() => decide(a, "UNDO_CHECK_IN")} className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold disabled:opacity-50">Undo check-in</button>
      )}
      {(a.status === "PENDING_PAYMENT" || a.status === "CONFIRMED") && (
        <button disabled={busyId === a.id} onClick={() => decide(a, "CANCEL")} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold disabled:opacity-50">
          {a.status === "PENDING_PAYMENT" && event.isMembershipEvent ? "Reject" : "Cancel"}
        </button>
      )}
    </td>
  </tr>
))}
```

Set the table header to: Attendee · Batch & membership · Package · Payment · Status · Actions. Status filter options: `ALL`, `PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`, `CANCELLED`. KPI cards: confirmed revenue `formatTaka(totals.confirmedRevenue)` (incl. donations `formatTaka(totals.confirmedDonations)`), pending `formatTaka(totals.pendingRevenue)`, head count `totals.headCount`, checked in `checkedInCount`. Remove the meal-count KPIs (meal is free text now).

- [ ] **Step 5: Verification queues show "awaiting payment"**

In `app/admin/page.tsx` and `app/admin/alumni/page.tsx`, where a `PENDING` request renders its Approve/Reject buttons, render instead when `r.awaitingPayment`:

```tsx
<span className="text-[11px] font-semibold text-amber-700">Awaiting payment confirmation — approve from the Jubilee attendee list</span>
```

- [ ] **Step 6: Verify in the browser**

As admin: create an event with a package (price ৳700, 2 adults), edit it, try deleting an event with a registration (toast "has registrations"), open the Jubilee studio, fill payment instructions, approve the pending registration from Task 12.
Expected: the member becomes VERIFIED (profile page, directory with "verified only"), the registration CONFIRMED, their dashboard shows "Show ticket", and the Alumni Verification page no longer lists them as pending. Check at 375px width.

- [ ] **Step 7: Commit**

```bash
git add app/admin
git commit -m "feat(admin): manage events and approve registrations from the database"
```

---

### Task 15: Gate scanner accepts event tickets

**Files:**
- Modify: `app/admin/gate-verify/page.tsx` (the verify handler around lines 66-108)

**Interfaces:**
- Consumes: `POST /api/events/verify-ticket` (Task 9), `TICKET_QR_PREFIX` value `"SSGHS-TICKET:"`.

- [ ] **Step 1: Branch the verify handler on ticket scans**

At the start of the verify handler, after `let token = qrInput.trim();`, insert:

```tsx
    if (token.startsWith("SSGHS-TICKET:")) {
      try {
        const res = await fetch("/api/events/verify-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: token }),
        });
        const data = await res.json();
        if (data.ok) {
          setLatestResult({
            valid: true,
            alumnus: { fullName: data.attendee.name, sscBatch: data.attendee.batch, alumniId: `${data.eventTitle} · ${data.packageName ?? ""} · ${data.headCount} people`, membershipTier: "EVENT TICKET" },
          });
          setScanHistory([{ id: `scan-${Date.now()}`, name: data.attendee.name, batch: data.attendee.batch, alumniId: data.eventTitle, status: "AUTHORIZED", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), gate: "Event Ticket" }, ...scanHistory]);
        } else {
          setLatestResult({ valid: false, error: data.message || data.error });
        }
      } catch (err) {
        setLatestResult({ valid: false, error: `Verification request failed: ${(err as Error).message}` });
      } finally {
        setIsVerifying(false);
      }
      return;
    }
```

(Adapt field names to the page's existing `latestResult`/`scanHistory` types if they differ; keep the card flow below unchanged.)

- [ ] **Step 2: Verify in the browser**

Copy the member's ticket QR text (dashboard → Show ticket → the QR encodes `SSGHS-TICKET:…`; read it via `/api/me/registrations` `ticket.qrText`) into the gate scanner as admin, verify twice.
Expected: first "AUTHORIZED ENTRY — <name>", second "Already checked in at HH:MM"; the studio shows CHECKED IN.

- [ ] **Step 3: Commit**

```bash
git add app/admin/gate-verify/page.tsx
git commit -m "feat(gate): check event tickets in from the gate scanner"
```

---

### Task 16: Remove the browser-storage events; docs; full end-to-end run

**Files:**
- Delete: `lib/events-service.ts`
- Modify: `docs/API_SPECIFICATION.md`, `docs/EVENTS_RSVP_DESIGN.md` (status line)

- [ ] **Step 1: Delete the old module and confirm nothing imports it**

Run: `git rm lib/events-service.ts && npx tsc --noEmit -p .`
Expected: no errors (any remaining import is a missed step in Tasks 11/14 — fix it there).

- [ ] **Step 2: Document the APIs in `docs/API_SPECIFICATION.md`**

Add an "Events & registration" section listing, with request/response shapes as implemented: `GET /api/events`, `GET /api/events/[slug]`, `GET /api/events/membership`, `GET|POST /api/events/[slug]/rsvp`, `GET /api/me/registrations`, `POST /api/events/verify-ticket`, `GET|POST /api/admin/events`, `GET|PUT|DELETE /api/admin/events/[id]`, `PATCH /api/admin/events/[id]/registrations/[regId]`, and `POST /api/auth/register` → 410.

- [ ] **Step 3: Full checks**

Run: `npm test && npx tsc --noEmit -p . && npx eslint . && npm run build`
Expected: all tests pass; no type errors; no new lint errors compared with `main`; build succeeds.

- [ ] **Step 4: End-to-end journey in the browser (local seeded DB)**

Visitor → `/register` → combined form → dashboard "Pending" → admin approves in the Jubilee studio → member dashboard shows ticket, card page shows "Valid at the gate" → gate scan admits once, second scan refused → signed-out visitor on a non-membership event sees "verified members only". Repeat the key screens at 375px width.

- [ ] **Step 5: Commit**

```bash
git add -A lib docs
git commit -m "chore(events): remove browser-storage events and document the event APIs"
```
