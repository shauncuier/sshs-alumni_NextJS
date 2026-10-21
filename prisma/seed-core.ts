import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { EventItem } from "../lib/data";
import { FIRST_BATCH } from "../lib/batches";
import { normalizePackages, parseTaka } from "../lib/events/pricing";
import { ensureSuperAdmin, envSuperAdminEmail, type EnsureResult } from "../lib/admin/super-admin";
import { backfillEventJsonColumns } from "./backfill-events";
import { MEMBERSHIP_EVENT_ID, membershipBatchFees, membershipEvent, membershipGuestTypes } from "./membership-event";
import { demoEvents } from "./demo-events";

/**
 * Seed steps shared by the demo seed (prisma/seed.ts, local development) and the
 * production seed (prisma/seed-prod.ts). Every step is safe to re-run.
 */

type Env = Record<string, string | undefined>;

// Accounts that earlier seeds created with passwords published in this repository.
export const LEGACY_ACCOUNTS = [
  { email: "admin@sabujsghs.edu.bd", publishedPassword: "admin123" },
  { email: "jashedul@example.com", publishedPassword: "password123" },
];

// Default addresses of the demo seed's test accounts (one per role).
export const DEMO_ACCOUNT_DEFAULTS = {
  SEED_ADMIN_EMAIL: "admin@sabujsghs.edu.bd",
  SEED_MODERATOR_EMAIL: "moderator@sabujsghs.edu.bd",
  SEED_ALUMNI_EMAIL: "jashedul@example.com",
} as const;

/** The demo seed creates test accounts and sample content: never on a production server. */
export function assertDemoSeedAllowed(env: Env = process.env): void {
  if (env.NODE_ENV === "production") {
    throw new Error(
      "npm run db:seed creates test accounts and sample content and is blocked when NODE_ENV=production. " +
        "Use npm run db:seed:prod on a production database."
    );
  }
}

/**
 * One Batch row per SSC year from FIRST_BATCH to this year. Only the name is set:
 * representative, contact and reunion date come from admins (/admin/batches), and
 * member counts from verified profiles. Also clears the invented representatives
 * and taglines that earlier seeds wrote.
 */
export async function seedBatches(): Promise<number> {
  const thisYear = new Date().getFullYear();
  let created = 0;
  for (let year = FIRST_BATCH; year <= thisYear; year++) {
    const existing = await prisma.batch.findUnique({ where: { year }, select: { id: true } });
    if (!existing) {
      await prisma.batch.create({ data: { year, name: `SSC Batch ${year}` } });
      created++;
    }
  }
  await prisma.batch.updateMany({ where: { classRepresentative: { startsWith: "Representative Batch " } }, data: { classRepresentative: null } });
  await prisma.batch.updateMany({ where: { tagline: { startsWith: "Proud alumni of Sabuj Shikshayatan Government High School Class of" } }, data: { tagline: null } });
  await prisma.batch.updateMany({ where: { totalMembers: { gt: 0 } }, data: { totalMembers: 0, reunionCount: 0 } });
  return created;
}

export const eventSlug = (e: Pick<EventItem, "title">) =>
  e.title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/** Creates an event from site content if its slug is free; an existing event is never changed. */
export async function seedEvent(e: EventItem, opts: { membership?: boolean } = {}): Promise<boolean> {
  const slug = eventSlug(e);
  if (await prisma.event.findUnique({ where: { slug }, select: { id: true } })) return false;
  const membership = Boolean(opts.membership);
  await prisma.event.create({
    data: {
      slug,
      title: e.title,
      category: e.category,
      description: e.description,
      date: new Date(`${e.date}T09:00:00+06:00`),
      // The Golden Jubilee's day is not fixed yet; admins untick this in /admin/events once it is.
      dateTentative: membership,
      time: e.time || null,
      venue: e.venue,
      locationCity: e.locationCity,
      organizer: e.organizer,
      bannerImage: e.bannerImage,
      maxAttendees: e.maxAttendees,
      registrationFee: parseTaka(e.registrationFee ?? 0) || 0,
      isRegistrationOpen: e.isRegistrationOpen,
      subtitle: e.subtitle ?? null,
      guestOfHonor: e.guestOfHonor ?? null,
      souvenirDetails: e.souvenirDetails ?? null,
      registrationDeadline: /^\d{4}-\d{2}-\d{2}$/.test(e.registrationDeadline ?? "") ? new Date(`${e.registrationDeadline}T23:59:59+06:00`) : null,
      isMegaEvent: e.isMegaEvent ?? false,
      isMembershipEvent: membership,
      guestTypes: (membership ? membershipGuestTypes : []) as unknown as Prisma.InputJsonValue,
      batchFees: (membership ? membershipBatchFees : []) as unknown as Prisma.InputJsonValue,
      agenda: (e.agenda ?? []) as unknown as Prisma.InputJsonValue,
      highlights: e.highlights ?? [],
      packages: normalizePackages(e.packages ?? []) as unknown as Prisma.InputJsonValue,
      // Left for an admin to fill in; joining stays closed until they exist.
      paymentInstructions: null,
    },
  });
  return true;
}

/** The membership event, unless the database already has one. */
export async function seedMembershipEvent(): Promise<boolean> {
  if (await prisma.event.findFirst({ where: { isMembershipEvent: true }, select: { id: true } })) return false;
  return seedEvent({ ...membershipEvent, id: MEMBERSHIP_EVENT_ID }, { membership: true });
}

/**
 * Repairs left by earlier schema changes: empty event JSON columns, and free
 * registrations the RegistrationStatus migration defaulted to PENDING_PAYMENT
 * (new code never leaves a registration in that state with no money attached).
 */
export async function repairLegacyRows(): Promise<{ eventJson: number; registrations: number }> {
  const eventJson = await backfillEventJsonColumns(prisma);
  const { count } = await prisma.eventRegistration.updateMany({
    where: { status: "PENDING_PAYMENT", totalFee: 0, donationAmount: 0, transactionId: null },
    data: { status: "CONFIRMED" },
  });
  return { eventJson, registrations: count };
}

/**
 * An account that still has a password published in this repository is disabled
 * and given a random password; an account whose password was changed is left alone.
 */
export async function lockLegacyAccounts(): Promise<string[]> {
  const locked: string[] = [];
  for (const { email, publishedPassword: password } of LEGACY_ACCOUNTS) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) continue;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
        disabledAt: new Date(),
        sessionVersion: { increment: 1 },
      },
    });
    locked.push(email);
  }
  return locked;
}

/** Things a production database should not have, reported for an admin to remove. */
export async function findDemoLeftovers(env: Env = process.env): Promise<string[]> {
  const notes: string[] = [];
  const emails = Object.entries(DEMO_ACCOUNT_DEFAULTS).map(([key, fallback]) => (env[key] || fallback).trim().toLowerCase());
  const accounts = await prisma.user.findMany({ where: { email: { in: emails }, disabledAt: null }, select: { email: true } });
  for (const a of accounts) notes.push(`Test account ${a.email} is active; disable it in /admin/users if nobody uses it.`);

  const w = demoContentWhere();
  const counts: [string, number][] = [
    ["news article(s)", await prisma.newsArticle.count({ where: w.news })],
    ["announcement(s)", await prisma.announcement.count({ where: w.announcements })],
    ["feed post(s)", await prisma.post.count({ where: w.posts })],
    ["event(s)", await prisma.event.count({ where: { slug: { in: w.eventSlugs } } })],
    ["donation campaign(s)", await prisma.donationCampaign.count({ where: { slug: { in: DEMO_CAMPAIGN_SLUGS } } })],
  ];
  for (const [label, c] of counts) {
    if (c > 0) notes.push(`${c} demo ${label} found; remove with npm run db:remove-demo.`);
  }

  // An old admin button filled made-up bKash, Nagad and bank numbers into events.
  const fakeAccounts = await prisma.event.findMany({
    where: { OR: FAKE_PAYMENT_MARKERS.map((m) => ({ paymentInstructions: { contains: m } })) },
    select: { title: true },
  });
  for (const e of fakeAccounts) {
    notes.push(`Event "${e.title}" shows made-up payment accounts; replace its payment instructions in /admin/events before anyone pays.`);
  }
  return notes;
}

// Numbers from the removed "Load SSHS Defaults" button; none belongs to the association.
export const FAKE_PAYMENT_MARKERS = ["01700000000", "01800000000", "104-101-0023456"];

// Slugs of the sample campaigns created by the demo seed.
export const DEMO_CAMPAIGN_SLUGS = ["student-merit-scholarship", "modern-stem-lab", "library-renovation-fund"];

function demoContentWhere() {
  const seeded = { id: { startsWith: "seed-" } };
  return { news: seeded, announcements: seeded, posts: seeded, eventSlugs: demoEvents.map(eventSlug) };
}

/**
 * Deletes the demo seed's sample content. Events with registrations and campaigns
 * with donations are kept: they hold real people's records. Accounts are never deleted.
 */
export async function removeDemoContent(): Promise<Record<string, number>> {
  const w = demoContentWhere();
  return {
    posts: (await prisma.post.deleteMany({ where: w.posts })).count,
    news: (await prisma.newsArticle.deleteMany({ where: w.news })).count,
    announcements: (await prisma.announcement.deleteMany({ where: w.announcements })).count,
    events: (await prisma.event.deleteMany({ where: { slug: { in: w.eventSlugs }, registrations: { none: {} } } })).count,
    campaigns: (await prisma.donationCampaign.deleteMany({ where: { slug: { in: DEMO_CAMPAIGN_SLUGS }, donations: { none: {} } } })).count,
  };
}

export interface ProductionSeedResult {
  superAdmin: EnsureResult;
  batchesCreated: number;
  membershipEventCreated: boolean;
  repaired: { eventJson: number; registrations: number };
  lockedLegacyAccounts: string[];
  warnings: string[];
}

/** Batches, the super admin and the membership event. No test accounts, no sample content. */
export async function runProductionSeed(env: Env = process.env): Promise<ProductionSeedResult> {
  if (!envSuperAdminEmail()) {
    throw new Error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set: a production database needs its super admin.");
  }
  const superAdmin = await ensureSuperAdmin();
  const batchesCreated = await seedBatches();
  const repaired = await repairLegacyRows();
  const membershipEventCreated = await seedMembershipEvent();
  const lockedLegacyAccounts = await lockLegacyAccounts();
  const warnings = await findDemoLeftovers(env);
  return { superAdmin, batchesCreated, membershipEventCreated, repaired, lockedLegacyAccounts, warnings };
}
