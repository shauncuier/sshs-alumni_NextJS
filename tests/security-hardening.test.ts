import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "./helpers/db";
import { uploadsRoot } from "@/lib/media/avatars";
import { purgeRejectedApplicantFiles, rejectedRetentionDays } from "@/lib/privacy-cleanup";
import { updateEvent } from "@/lib/events/service";

beforeEach(async () => {
  await resetDatabase();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("security headers", () => {
  const load = async (env: string) => {
    vi.stubEnv("NODE_ENV", env);
    vi.resetModules();
    const config = (await import("../next.config.mjs")).default;
    const rules = await config.headers!();
    return Object.fromEntries(rules[0].headers.map((h) => [h.key, h.value]));
  };

  it("production sends a strict policy, HSTS and no legacy XSS auditor", async () => {
    const h = await load("production");
    expect(h["Content-Security-Policy"]).toContain("connect-src 'self';");
    expect(h["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(h["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
    expect(h["Content-Security-Policy"]).not.toContain("unsafe-eval");
    expect(h["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
    expect(h["X-XSS-Protection"]).toBe("0");
    expect(h["Permissions-Policy"]).toContain("camera=(self)");
    expect(h["Cross-Origin-Opener-Policy"]).toBe("same-origin");
  });

  it("the camera is for this site only, on every page (the gate opens without a page reload)", async () => {
    const h = await load("production");
    expect(h["Permissions-Policy"]).toMatch(/camera=\(self\)/);
    expect(h["Permissions-Policy"]).toContain("microphone=()");
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const rules = await (await import("../next.config.mjs")).default.headers!();
    // No page-specific camera rule: it would not apply after client-side navigation.
    expect(rules.filter((r) => r.headers.some((x) => x.key === "Permissions-Policy"))).toHaveLength(1);
  });

  it("development allows the HMR socket and sends no HSTS", async () => {
    const h = await load("development");
    expect(h["Content-Security-Policy"]).toContain("connect-src 'self' ws: wss:");
    expect(h["Strict-Transport-Security"]).toBeUndefined();
  });
});

describe("bare domain redirect", () => {
  const redirects = async (appUrl: string) => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", appUrl);
    vi.resetModules();
    return (await import("../next.config.mjs")).default.redirects!();
  };

  it("sends the bare domain to the www address, keeping the path", async () => {
    const rule = (await redirects("https://www.exsabujian.org")).find((r) => r.has);
    expect(rule).toEqual({
      source: "/:path*",
      has: [{ type: "host", value: "exsabujian.org" }],
      destination: "https://www.exsabujian.org/:path*",
      permanent: true,
    });
  });

  it("adds nothing when the site address has no www (local development)", async () => {
    expect((await redirects("http://localhost:3000")).some((r) => r.has)).toBe(false);
  });
});

describe("privacy clean-up of rejected applicants", () => {
  const DAY = 86_400_000;
  const id = (n: number) => String(n).padStart(32, "a");
  const file = async (kind: string, folder: string, name: string) => {
    const dir = path.join(uploadsRoot(), kind, folder);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), "x");
    return dir;
  };
  const exists = (p: string) => fs.access(p).then(() => true, () => false);

  async function applicant(status: "REJECTED" | "VERIFIED", decidedDaysAgo: number, n: number) {
    const m = await makeMember({ status });
    const avatarDir = await file("avatars", id(n), "avatar.webp");
    const receiptDir = await file("receipts", id(n + 100), "receipt.jpg");
    await prisma.alumniProfile.update({
      where: { userId: m.id },
      data: { avatarUrl: `/api/media/avatars/${id(n)}/avatar.webp`, avatarOriginalUrl: `/api/media/avatars/${id(n)}/original.jpg` },
    });
    const event = await makeEvent({ isMembershipEvent: true, slug: `join-${n}` });
    await prisma.eventRegistration.create({
      data: { eventId: event.id, userId: m.id, status: "CANCELLED", transactionId: `TRX${n}`, notes: `Hi\n[Payment Screenshot: /api/media/receipts/${id(n + 100)}/receipt.jpg]` },
    });
    const req = await prisma.verificationRequest.create({ data: { userId: m.id, sscBatch: 2000, status } });
    await prisma.$executeRaw`UPDATE VerificationRequest SET updatedAt = ${new Date(Date.now() - decidedDaysAgo * DAY)} WHERE id = ${req.id}`;
    return { m, avatarDir, receiptDir };
  }

  it("deletes photos and payment screenshots of applicants rejected over 30 days ago, and logs it", async () => {
    const old = await applicant("REJECTED", 31, 1);
    const recent = await applicant("REJECTED", 5, 2);
    const member = await applicant("VERIFIED", 90, 3);

    expect(rejectedRetentionDays({})).toBe(30);
    expect(await purgeRejectedApplicantFiles()).toEqual({ users: 1, folders: 2 });

    expect(await exists(old.avatarDir)).toBe(false);
    expect(await exists(old.receiptDir)).toBe(false);
    const profile = await prisma.alumniProfile.findUniqueOrThrow({ where: { userId: old.m.id } });
    expect(profile).toMatchObject({ avatarUrl: null, avatarOriginalUrl: null });
    const reg = await prisma.eventRegistration.findFirstOrThrow({ where: { userId: old.m.id } });
    expect(reg.notes).toContain("Payment screenshot deleted");
    expect(reg.transactionId).toBe("TRX1"); // the payment reference stays on record

    for (const kept of [recent, member]) {
      expect(await exists(kept.avatarDir)).toBe(true);
      expect(await exists(kept.receiptDir)).toBe(true);
    }
    expect(await prisma.activityLog.count({ where: { action: "privacy.rejected_files_purged" } })).toBe(1);

    // Nothing left to do on the next run, and nothing logged.
    expect(await purgeRejectedApplicantFiles()).toEqual({ users: 0, folders: 0 });
    expect(await prisma.activityLog.count({ where: { action: "privacy.rejected_files_purged" } })).toBe(1);
  });
});

describe("membership event flag", () => {
  it("cannot move while membership applications wait for a decision", async () => {
    const jubilee = await makeEvent({ isMembershipEvent: true, registrationFee: 1000 });
    const other = await makeEvent({ registrationFee: 500 });
    const applicant = await makeMember({ status: "PENDING" });
    const reg = await prisma.eventRegistration.create({ data: { eventId: jubilee.id, userId: applicant.id, status: "PENDING_PAYMENT", totalFee: 1000, transactionId: "TRXPENDING" } });

    await expect(updateEvent(jubilee.id, { isMembershipEvent: false })).rejects.toMatchObject({ status: 409, code: "MEMBERSHIP_JOINS_PENDING" });
    await expect(updateEvent(other.id, { isMembershipEvent: true })).rejects.toMatchObject({ status: 409 });
    // Other edits still work.
    await expect(updateEvent(jubilee.id, { venue: "New Hall" })).resolves.toBeTruthy();

    await prisma.eventRegistration.update({ where: { id: reg.id }, data: { status: "CONFIRMED" } });
    await expect(updateEvent(other.id, { isMembershipEvent: true })).resolves.toMatchObject({ isMembershipEvent: true });
    expect((await prisma.event.findUniqueOrThrow({ where: { id: jubilee.id } })).isMembershipEvent).toBe(false);
  });
});
