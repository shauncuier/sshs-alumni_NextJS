import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { FIRST_BATCH, listBatches } from "@/lib/batches";
import { makeMember, resetDatabase } from "./helpers/db";
import { assertDemoSeedAllowed, eventSlug, lockLegacyAccounts, removeDemoContent, runProductionSeed, seedBatches, seedEvent } from "../prisma/seed-core";
import { demoEvents } from "../prisma/demo-events";
import { membershipBatchFees, previousMembershipBatchFees } from "../prisma/membership-event";
import { computeFee, normalizeBatchFees } from "@/lib/events/pricing";

beforeEach(async () => {
  await resetDatabase();
  vi.stubEnv("SUPER_ADMIN_EMAIL", "Chief@Example.test");
  vi.stubEnv("SUPER_ADMIN_PASSWORD", "Super-Admin-Pw-123");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("production seed", () => {
  it("creates only the batches, the super admin and the membership event", async () => {
    const r = await runProductionSeed({});
    const years = new Date().getFullYear() - FIRST_BATCH + 1;
    expect(r).toMatchObject({ superAdmin: "created", batchesCreated: years, membershipEventCreated: true, lockedLegacyAccounts: [], warnings: [] });

    const users = await prisma.user.findMany({ select: { email: true, role: true } });
    expect(users).toEqual([{ email: "chief@example.test", role: "SUPER_ADMIN" }]);
    expect(await prisma.batch.count()).toBe(years);
    const events = await prisma.event.findMany({ select: { isMembershipEvent: true, paymentInstructions: true } });
    expect(events).toEqual([{ isMembershipEvent: true, paymentInstructions: null }]);
    for (const n of await Promise.all([
      prisma.post.count(),
      prisma.newsArticle.count(),
      prisma.announcement.count(),
      prisma.donationCampaign.count(),
    ])) {
      expect(n).toBe(0);
    }
    // The only profile is the super admin's own (SUPER_ADMIN_NAME / SUPER_ADMIN_SSC_BATCH).
    expect(await prisma.alumniProfile.findMany({ select: { user: { select: { email: true } } } })).toEqual([{ user: { email: "chief@example.test" } }]);
    // No invented representatives on any batch; the only member counted is the super admin.
    const batches = await listBatches();
    expect(batches.every((b) => b.classRepresentative === "")).toBe(true);
    expect(batches.reduce((n, b) => n + b.totalAlumni, 0)).toBeLessThanOrEqual(1);
  });

  it("is safe to run again and never replaces an existing membership event", async () => {
    await runProductionSeed({});
    await prisma.event.updateMany({ data: { title: "Edited by the committee" } });
    const again = await runProductionSeed({});
    expect(again).toMatchObject({ superAdmin: "unchanged", batchesCreated: 0, membershipEventCreated: false });
    expect(await prisma.event.findMany({ select: { title: true } })).toEqual([{ title: "Edited by the committee" }]);
  });

  it("gives rows written under the old association name the new one", async () => {
    await runProductionSeed({});
    await prisma.event.updateMany({ data: { organizer: "SSGHS Alumni Association", description: "You become a member of the SSGHS Alumni Association: welcome." } });
    const again = await runProductionSeed({});
    expect(again.renamedRows).toBe(2);
    expect(await prisma.event.findMany({ select: { organizer: true, description: true } })).toEqual([
      { organizer: "প্রাক্তন সবুজিয়ান পরিষদ", description: "You become a member of প্রাক্তন সবুজিয়ান পরিষদ: welcome." },
    ]);
    expect((await runProductionSeed({})).renamedRows).toBe(0);
  });

  it("replaces the retired English name with the Bangla one, without doubling it", async () => {
    await runProductionSeed({});
    await prisma.event.updateMany({
      data: { organizer: "Praktan Sabujian Parishad", description: "Praktan Sabujian Parishad (প্রাক্তন সবুজিয়ান পরিষদ) welcomes you." },
    });
    expect((await runProductionSeed({})).renamedRows).toBe(2);
    expect(await prisma.event.findMany({ select: { organizer: true, description: true } })).toEqual([
      { organizer: "প্রাক্তন সবুজিয়ান পরিষদ", description: "প্রাক্তন সবুজিয়ান পরিষদ welcomes you." },
    ]);
  });

  it("moves the jubilee from the old two batch fees to the three, once, and leaves an admin's own fees alone", async () => {
    const fees = async () => normalizeBatchFees((await prisma.event.findFirstOrThrow({ where: { isMembershipEvent: true } })).batchFees);
    expect((await runProductionSeed({})).batchFeesUpdated).toBe(false); // a new event already has the three
    expect(await fees()).toEqual(membershipBatchFees);

    await prisma.event.updateMany({ data: { batchFees: previousMembershipBatchFees as never } });
    expect((await runProductionSeed({})).batchFeesUpdated).toBe(true);
    expect(await fees()).toEqual([
      { fromBatch: 1989, toBatch: 2014, price: 1500 },
      { fromBatch: 2015, toBatch: 2020, price: 1250 },
      { fromBatch: 2021, toBatch: 2026, price: 1000 },
    ]);
    expect((await runProductionSeed({})).batchFeesUpdated).toBe(false);

    const own = [{ fromBatch: 1989, toBatch: 2026, price: 1400 }];
    await prisma.event.updateMany({ data: { batchFees: own as never } });
    expect((await runProductionSeed({})).batchFeesUpdated).toBe(false);
    expect(await fees()).toEqual(own);
  });

  it("prices each batch by the jubilee's three tiers", () => {
    const event = { registrationFee: 1500, extraAdultFee: 0, childFee: 0, packages: [], guestTypes: [], batchFees: membershipBatchFees };
    const fee = (sscBatch: number) => computeFee(event, {}, { sscBatch }).fee;
    expect([fee(1995), fee(2014), fee(2015), fee(2020), fee(2021), fee(2026)]).toEqual([1500, 1500, 1250, 1250, 1000, 1000]);
  });

  it("refuses to run without a super admin in the environment", async () => {
    vi.stubEnv("SUPER_ADMIN_EMAIL", "");
    await expect(runProductionSeed({})).rejects.toThrow(/SUPER_ADMIN_EMAIL/);
    expect(await prisma.batch.count()).toBe(0);
  });

  it("warns about test accounts and demo content left in the database", async () => {
    await makeMember({ email: "moderator@sabujsghs.edu.bd", role: "MODERATOR" });
    const author = await makeMember();
    await prisma.post.create({ data: { id: "seed-post-campus-visit", authorId: author.id, content: "Demo" } });
    const { warnings } = await runProductionSeed({});
    expect(warnings).toEqual([
      expect.stringContaining("moderator@sabujsghs.edu.bd"),
      expect.stringContaining("1 demo feed post"),
    ]);
  });
});

describe("removing demo content", () => {
  it("deletes sample rows but keeps events with registrations and campaigns with donations", async () => {
    const member = await makeMember();
    await prisma.post.create({ data: { id: "seed-post-1", authorId: member.id, content: "Demo" } });
    await prisma.post.create({ data: { authorId: member.id, content: "Real post" } });
    await prisma.newsArticle.create({ data: { id: "seed-news-1", title: "Demo", category: "School News", excerpt: "x", content: "x", author: "x" } });
    await prisma.announcement.create({ data: { id: "seed-announcement-1", title: "Demo", content: "x" } });
    for (const e of demoEvents) await seedEvent(e);
    const kept = await prisma.event.findFirstOrThrow({ where: { slug: eventSlug(demoEvents[0]) } });
    await prisma.eventRegistration.create({ data: { eventId: kept.id, userId: member.id, totalFee: 0 } });
    const campaign = (slug: string) => prisma.donationCampaign.create({ data: { slug, title: slug, description: "x", goalAmount: 1000 } });
    await campaign("student-merit-scholarship");
    const used = await campaign("modern-stem-lab");
    await prisma.donation.create({ data: { campaignId: used.id, donorName: "Real Donor", amount: 500, paymentMethod: "bKash" } });

    const removed = await removeDemoContent();
    expect(removed).toEqual({ committeeTerms: 0, honorBoard: 0, constitution: 0, presidentMessage: 0, posts: 1, news: 1, announcements: 1, events: demoEvents.length - 1, campaigns: 1 });
    expect(await prisma.post.findMany({ select: { content: true } })).toEqual([{ content: "Real post" }]);
    expect(await prisma.event.count()).toBe(1);
    expect(await prisma.donationCampaign.count()).toBe(1);
  });
});

describe("seed safety", () => {
  it("the demo seed is blocked when NODE_ENV=production", () => {
    expect(() => assertDemoSeedAllowed({ NODE_ENV: "production" })).toThrow(/db:seed:prod/);
    expect(() => assertDemoSeedAllowed({ NODE_ENV: "development" })).not.toThrow();
  });

  it("disables accounts that still have the old published password", async () => {
    await prisma.user.create({ data: { email: "admin@sabujsghs.edu.bd", passwordHash: await bcrypt.hash("admin123", 4), role: "ADMIN", status: "VERIFIED" } });
    await prisma.user.create({ data: { email: "jashedul@example.com", passwordHash: await bcrypt.hash("a-changed-password", 4), status: "VERIFIED" } });

    expect(await lockLegacyAccounts()).toEqual(["admin@sabujsghs.edu.bd"]);
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@sabujsghs.edu.bd" } });
    expect(admin.disabledAt).not.toBeNull();
    expect(await bcrypt.compare("admin123", admin.passwordHash)).toBe(false);
    expect((await prisma.user.findUniqueOrThrow({ where: { email: "jashedul@example.com" } })).disabledAt).toBeNull();
  });

  it("clears representatives invented by earlier seeds but keeps real ones", async () => {
    await prisma.batch.create({ data: { year: 2008, name: "SSC Batch 2008", classRepresentative: "Representative Batch 2008", totalMembers: 77 } });
    await prisma.batch.create({ data: { year: 2009, name: "SSC Batch 2009", classRepresentative: "Rafiq Ahmed" } });
    await seedBatches();
    expect(await prisma.batch.findUnique({ where: { year: 2008 }, select: { classRepresentative: true, totalMembers: true } })).toEqual({ classRepresentative: null, totalMembers: 0 });
    expect((await prisma.batch.findUnique({ where: { year: 2009 } }))?.classRepresentative).toBe("Rafiq Ahmed");
  });
});
