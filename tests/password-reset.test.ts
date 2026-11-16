import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";
import { verifiedPhoneToken } from "./helpers/phone";

const sms = vi.hoisted(() => ({ sent: [] as string[], fail: false }));
vi.mock("@/lib/bulksmsbd", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bulksmsbd")>();
  return {
    ...actual,
    sendBulkSms: async (args: { numbers: string[] }) => {
      sms.sent.push(...args.numbers);
      return sms.fail
        ? { success: false, isSimulated: false, responseCode: 1007, totalNumbers: 1, validNumbers: [], invalidNumbers: [], error: "Insufficient balance" }
        : { success: true, isSimulated: false, responseCode: 202, totalNumbers: 1, validNumbers: args.numbers, invalidNumbers: [] };
    },
  };
});

import { requestPasswordResetCode, resetPasswordWithPhone } from "@/lib/password-reset";
import { resetSmsOutage } from "@/lib/phone-otp";
import { authorizeCredentials } from "@/lib/auth";

beforeEach(async () => {
  sms.sent = [];
  sms.fail = false;
  resetSmsOutage();
  await resetDatabase();
});

const withPhone = async (phone: string, verified = false) => {
  const m = await makeMember();
  await prisma.alumniProfile.update({ where: { userId: m.id }, data: { phone, phoneVerifiedAt: verified ? new Date() : null } });
  return m;
};

describe("forgot password by SMS code", () => {
  it("texts a code only to a number that belongs to an account", async () => {
    await withPhone("01711000111");
    await expect(requestPasswordResetCode("+880 1711-000111")).resolves.toMatchObject({ phone: "01711000111" });
    expect(sms.sent).toEqual(["8801711000111"]);
    await expect(requestPasswordResetCode("01711000999")).rejects.toMatchObject({ status: 404, code: "NO_ACCOUNT" });
    await expect(requestPasswordResetCode("12345")).rejects.toMatchObject({ code: "INVALID_PHONE" });
    expect(sms.sent).toHaveLength(1);
  });

  it("sets the new password, signs out everywhere and marks the number verified", async () => {
    const me = await withPhone("01711000111");
    const before = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    const token = verifiedPhoneToken("8801711000111");

    await expect(resetPasswordWithPhone(token, "short")).rejects.toMatchObject({ code: "INVALID_PASSWORD" });
    await expect(resetPasswordWithPhone(token, "New-Password-2026")).resolves.toMatchObject({ email: me.email });

    const after = await prisma.user.findUniqueOrThrow({ where: { id: me.id }, include: { profile: true } });
    expect(await bcrypt.compare("New-Password-2026", after.passwordHash)).toBe(true);
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
    expect(after.profile?.phoneVerifiedAt).toBeInstanceOf(Date);
    await expect(authorizeCredentials({ email: me.email, password: "New-Password-2026" })).resolves.toMatchObject({ id: me.id });

    // The verification works once.
    await expect(resetPasswordWithPhone(token, "Another-Password-1")).rejects.toMatchObject({ code: "PHONE_NOT_VERIFIED" });
  });

  it("refuses a missing or forged verification, and a number with no account", async () => {
    await withPhone("01711000111");
    await expect(resetPasswordWithPhone(undefined, "New-Password-2026")).rejects.toMatchObject({ code: "PHONE_NOT_VERIFIED" });
    await expect(resetPasswordWithPhone("forged.token", "New-Password-2026")).rejects.toMatchObject({ code: "PHONE_NOT_VERIFIED" });
    await expect(resetPasswordWithPhone(verifiedPhoneToken("8801711000999"), "New-Password-2026")).rejects.toMatchObject({ code: "NO_ACCOUNT" });
  });

  it("an SMS outage says to ask the committee, not to use an email code", async () => {
    await withPhone("01711000111");
    sms.fail = true;
    const err = await requestPasswordResetCode("01711000111").catch((e) => e);
    expect(err).toMatchObject({ code: "SMS_FAILED" });
    expect(err.message).toContain("committee");
  });

  it("in SMS test mode the live site refuses a reset; only a local server shows the code", async () => {
    await withPhone("01711000111");
    const { setSmsTestMode } = await import("@/lib/sms-test-mode");
    await setSmsTestMode(true, "admin@example.test");
    vi.stubEnv("NODE_ENV", "production");
    await expect(requestPasswordResetCode("01711000111")).rejects.toMatchObject({ code: "RESET_UNAVAILABLE" });
    vi.unstubAllEnvs();
    await expect(requestPasswordResetCode("01711000111")).resolves.toMatchObject({ testCode: expect.any(String) });
    expect(sms.sent).toHaveLength(0);
  });

  it("the routes need a passing robot check and keep the email out of failures", async () => {
    const me = await withPhone("01711000111");
    vi.stubEnv("TURNSTILE_SECRET", "test-secret");
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), { status: 200 }));
    const { POST: request } = await import("@/app/api/auth/password-reset/request/route");
    const { POST: reset } = await import("@/app/api/auth/password-reset/route");
    const call = (handler: (r: Request) => Promise<Response>, body: unknown) =>
      handler(new Request("http://localhost/api/auth/password-reset", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost" }, body: JSON.stringify(body) }));
    const blocked = await call(request, { phone: "01711000111" });
    expect(blocked.status).toBe(403);
    expect(sms.sent).toHaveLength(0);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();

    const ok = await call(reset, { verificationToken: verifiedPhoneToken("8801711000111"), newPassword: "New-Password-2026" });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ email: me.email });
    const bad = await call(reset, { verificationToken: "forged", newPassword: "New-Password-2026" });
    expect(bad.status).toBe(400);
    expect(JSON.stringify(await bad.json())).not.toContain(me.email);
  });
});
