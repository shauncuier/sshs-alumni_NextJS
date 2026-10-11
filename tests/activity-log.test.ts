import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { isSecretKey, listActivity, logActivity, logFailure, pruneActivityLog, scrubMetadata } from "@/lib/activity-log";
import { authorizeCredentials } from "@/lib/auth";
import { makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { PATCH as patchUser } from "@/app/api/admin/users/[id]/route";
import { GET as getLogs } from "@/app/api/admin/logs/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

const req = (url = "http://x/api", init: RequestInit = {}) =>
  new Request(url, {
    ...init,
    headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1", "user-agent": "TestBrowser/1.0", ...((init.headers as Record<string, string>) ?? {}) },
  });

describe("scrubMetadata", () => {
  it("never stores passwords, codes or tokens, at any depth", () => {
    const out = scrubMetadata({
      password: "Secret-1",
      newPassword: "Secret-2",
      verificationToken: "tok-abc",
      phoneVerificationToken: "tok-abc",
      challenge: "sealed-xyz",
      code: "4821",
      otp: "4821",
      apiKey: "key-123",
      nested: { passwordHash: "$2b$hash", list: [{ token: "tok-nested" }] },
      // Look-alikes that are fine to keep:
      errorCode: "OTP_WRONG",
      shipping: "Dhaka",
      message: "Hello",
      amount: 500,
    }) as Record<string, unknown>;
    const json = JSON.stringify(out);
    for (const secret of ["Secret-1", "Secret-2", "tok-abc", "sealed-xyz", "4821", "key-123", "$2b$hash", "tok-nested"]) {
      expect(json).not.toContain(secret);
    }
    expect(out).toMatchObject({ errorCode: "OTP_WRONG", shipping: "Dhaka", message: "Hello", amount: 500 });
  });

  it("recognises secret key names", () => {
    expect(["password", "currentPassword", "emailVerificationToken", "code", "PIN", "api_key"].every(isSecretKey)).toBe(true);
    expect(["errorCode", "opinion", "shipping", "transactionRef", "phone"].some(isSecretKey)).toBe(false);
  });

  it("cuts long strings", () => {
    expect((scrubMetadata({ note: "x".repeat(2000) }) as { note: string }).note.length).toBeLessThanOrEqual(501);
  });
});

describe("logActivity", () => {
  it("records actor, target, IP and browser", async () => {
    await logActivity({
      category: "ADMIN",
      action: "test.action",
      summary: "Did a thing",
      actor: { id: "u1", email: "Admin@Example.test", role: "ADMIN" },
      targetType: "User",
      targetId: "u2",
      metadata: { password: "nope", reason: "because" },
      req: req(),
    });
    const entry = await prisma.activityLog.findFirstOrThrow();
    expect(entry).toMatchObject({
      category: "ADMIN",
      status: "SUCCESS",
      actorEmail: "admin@example.test",
      actorRole: "ADMIN",
      targetId: "u2",
      ip: "203.0.113.7",
      userAgent: "TestBrowser/1.0",
    });
    expect(entry.metadata).toEqual({ password: "[redacted]", reason: "because" });
  });

  it("logs only security-relevant failures", async () => {
    await logFailure(new AppError("INVALID_USER", 400, "Bad name"), { category: "ADMIN", action: "x" });
    await logFailure(new Error("boom"), { category: "ADMIN", action: "x" });
    expect(await prisma.activityLog.count()).toBe(0);
    await logFailure(new AppError("FORBIDDEN", 403, "No"), { category: "ADMIN", action: "x.refused" });
    await logFailure(new AppError("RATE_LIMITED", 429, "Slow down"), { category: "VERIFY", action: "x.limited" });
    const entries = await prisma.activityLog.findMany({ orderBy: { action: "asc" } });
    expect(entries.map((e) => [e.action, e.category, e.status])).toEqual([
      ["x.limited", "SECURITY", "FAILURE"],
      ["x.refused", "ADMIN", "FAILURE"],
    ]);
  });
});

describe("what gets logged", () => {
  it("successful and failed sign-ins, with the IP and never the password", async () => {
    await makeMember({ email: "m@example.test" });
    const headers = { headers: { "x-real-ip": "198.51.100.4", "user-agent": "Phone" } };
    await authorizeCredentials({ email: "m@example.test", password: "Member-Pw-1234" }, headers);
    await expect(authorizeCredentials({ email: "m@example.test", password: "wrong-password" }, headers)).rejects.toThrow();
    const entries = await prisma.activityLog.findMany({ orderBy: { createdAt: "asc" } });
    expect(entries.map((e) => [e.action, e.status, e.actorEmail, e.ip])).toEqual([
      ["auth.sign_in", "SUCCESS", "m@example.test", "198.51.100.4"],
      ["auth.sign_in_failed", "FAILURE", "m@example.test", "198.51.100.4"],
    ]);
    expect(JSON.stringify(entries)).not.toContain("wrong-password");
  });

  it("admin user changes, and refused ones", async () => {
    const admin = await makeMember({ role: "ADMIN", email: "boss@example.test" });
    const member = await makeMember({ email: "m@example.test" });
    const otherAdmin = await makeMember({ role: "ADMIN", email: "peer@example.test" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    const patch = (id: string, body: unknown) =>
      patchUser(req("http://x/api", { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } }), {
        params: Promise.resolve({ id }),
      });

    expect((await patch(member.id, { action: "password", password: "Fresh-Pw-2026" })).status).toBe(200);
    expect((await patch(otherAdmin.id, { action: "disable" })).status).toBe(403);

    const ok = await prisma.activityLog.findFirstOrThrow({ where: { action: "user.password" } });
    expect(ok).toMatchObject({ actorEmail: "boss@example.test", targetId: member.id, category: "ADMIN" });
    expect(JSON.stringify(ok)).not.toContain("Fresh-Pw-2026");
    const refused = await prisma.activityLog.findFirstOrThrow({ where: { action: "user.change_refused" } });
    expect(refused).toMatchObject({ status: "FAILURE", targetId: otherAdmin.id });
  });
});

describe("reading the log", () => {
  it("is for admins only, and filters by category, outcome and text", async () => {
    await logActivity({ category: "AUTH", action: "auth.sign_in", summary: "alpha signed in" });
    await logActivity({ category: "SECURITY", action: "rate_limited", status: "FAILURE", summary: "beta limited" });

    expect((await getLogs(req("http://x/api/admin/logs"))).status).toBe(403);
    const member = await makeMember();
    session.user = { id: member.id, email: member.email, role: "ALUMNI" };
    expect((await getLogs(req("http://x/api/admin/logs"))).status).toBe(403);

    session.user = { id: "a", email: "a@example.test", role: "ADMIN" };
    const all = await (await getLogs(req("http://x/api/admin/logs"))).json();
    expect(all.total).toBe(2);
    expect((await listActivity({ category: "SECURITY" })).entries.map((e) => e.summary)).toEqual(["beta limited"]);
    expect((await listActivity({ status: "SUCCESS" })).total).toBe(1);
    expect((await listActivity({ q: "alpha" })).total).toBe(1);
  });

  it("prunes entries past the retention period", async () => {
    await prisma.activityLog.create({ data: { category: "AUTH", action: "old", summary: "old", createdAt: new Date("2020-01-01") } });
    await logActivity({ category: "AUTH", action: "new", summary: "new" });
    expect(await pruneActivityLog()).toBe(1);
    expect((await prisma.activityLog.findMany()).map((e) => e.action)).toEqual(["new"]);
  });
});
