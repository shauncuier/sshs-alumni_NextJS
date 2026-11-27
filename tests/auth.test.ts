import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeCredentials, INVALID_LOGIN_MESSAGE, loginIdentifier, SIGN_IN_PAUSED_MESSAGE } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { LEGACY_PENDING_MESSAGE, MEMBERSHIP_REJECTED_MESSAGE, PENDING_APPROVAL_MESSAGE } from "@/lib/account-access";
import { makeEvent, makeMember, resetDatabase } from "./helpers/db";

// The real module, except rate limits (always allowed under test anyway) are watchable.
vi.mock("@/lib/request-security", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/request-security")>()),
  consumeRateLimit: vi.fn(() => true),
}));

const PASSWORD = "Member-Pw-1234";

describe("authorizeCredentials", () => {
  beforeEach(resetDatabase);

  it("signs in a verified member", async () => {
    const m = await makeMember({ status: "VERIFIED" });
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).resolves.toMatchObject({ id: m.id, email: m.email });
  });
  it("refuses a pending member whose membership payment is under review with the payment message", async () => {
    const m = await makeMember({ status: "PENDING" });
    const event = await makeEvent({ isMembershipEvent: true, registrationFee: 1000 });
    await prisma.eventRegistration.create({
      data: { eventId: event.id, userId: m.id, status: "PENDING_PAYMENT", totalFee: 1000, transactionId: "TRX-AUTH-1" },
    });
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).rejects.toThrow(new Error(PENDING_APPROVAL_MESSAGE));
  });
  it("tells a pending member with no membership payment (old free sign-up) to contact the committee", async () => {
    const m = await makeMember({ status: "PENDING" });
    // A pending registration for an ordinary event is not a membership payment.
    const event = await makeEvent({ registrationFee: 500 });
    await prisma.eventRegistration.create({
      data: { eventId: event.id, userId: m.id, status: "PENDING_PAYMENT", totalFee: 500, transactionId: "TRX-AUTH-2" },
    });
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).rejects.toThrow(new Error(LEGACY_PENDING_MESSAGE));
  });
  it("refuses a rejected member", async () => {
    const m = await makeMember({ status: "REJECTED" });
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).rejects.toThrow(new Error(MEMBERSHIP_REJECTED_MESSAGE));
  });
  it("never locks out staff", async () => {
    const m = await makeMember({ status: "PENDING", role: "ADMIN" });
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).resolves.toMatchObject({ id: m.id, role: "ADMIN" });
  });
  it("pauses signing in while the site reads the standby copy (it holds no password hashes)", async () => {
    const m = await makeMember({ status: "VERIFIED" });
    process.env.STANDBY_DATABASE_URL = "mysql://u:p@standby.example:4000/sshs_standby";
    const mode = await import("@/lib/db-mode");
    vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mode.setMode("standby");
      await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).rejects.toThrow(new Error(SIGN_IN_PAUSED_MESSAGE));
    } finally {
      mode.resetDbMode();
      fs.rmSync(path.join(process.env.UPLOADS_DIR!, ".db-mode.json"), { force: true });
      process.env.STANDBY_DATABASE_URL = "";
      vi.restoreAllMocks();
    }
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).resolves.toMatchObject({ id: m.id });
  });
  it("keeps the generic message for a wrong password", async () => {
    const m = await makeMember({ status: "PENDING" });
    await expect(authorizeCredentials({ email: m.email, password: "wrong-password" })).rejects.toThrow(new Error(INVALID_LOGIN_MESSAGE));
  });
});

describe("signing in with a mobile number", () => {
  beforeEach(resetDatabase);

  async function memberWithPhone(phone: string) {
    const m = await makeMember({ status: "VERIFIED" });
    await prisma.alumniProfile.update({ where: { userId: m.id }, data: { phone } });
    return m;
  }

  it("takes the number in any common form", async () => {
    const m = await memberWithPhone("01711234567");
    for (const typed of ["01711234567", "+8801711234567", "8801711234567", " 01711 234 567 ", "+880 1711-234567"]) {
      await expect(authorizeCredentials({ email: typed, password: PASSWORD }), typed).resolves.toMatchObject({ id: m.id, email: m.email });
    }
  });

  it("finds a number saved in an older form", async () => {
    const m = await memberWithPhone("+8801811234567");
    await expect(authorizeCredentials({ email: "01811234567", password: PASSWORD })).resolves.toMatchObject({ id: m.id });
  });

  it("gives the same message for a wrong password, an unknown number and text that is no number", async () => {
    await memberWithPhone("01911234567");
    for (const [typed, password] of [
      ["01911234567", "wrong-password"],
      ["01511111111", PASSWORD],
      ["not-a-phone", PASSWORD],
      ["12345", PASSWORD],
    ]) {
      await expect(authorizeCredentials({ email: typed, password }), typed).rejects.toThrow(new Error(INVALID_LOGIN_MESSAGE));
    }
  });

  it("still signs in by email", async () => {
    const m = await memberWithPhone("01611234567");
    await expect(authorizeCredentials({ email: m.email.toUpperCase(), password: PASSWORD })).resolves.toMatchObject({ id: m.id });
  });

  it("applies the account rules (a rejected member) the same way", async () => {
    const m = await makeMember({ status: "REJECTED" });
    await prisma.alumniProfile.update({ where: { userId: m.id }, data: { phone: "01311234567" } });
    await expect(authorizeCredentials({ email: "01311234567", password: PASSWORD })).rejects.toThrow(new Error(MEMBERSHIP_REJECTED_MESSAGE));
  });

  it("counts a guess by phone against the account's email limit too", async () => {
    // Rate limits are off under test; watch which keys a sign-in consumes instead.
    const security = await import("@/lib/request-security");
    const m = await memberWithPhone("01411234567");
    vi.mocked(security.consumeRateLimit).mockClear();
    await authorizeCredentials({ email: "01411234567", password: "wrong" }).catch(() => undefined);
    const keys = vi.mocked(security.consumeRateLimit).mock.calls.map(([key]) => key);
    expect(keys).toEqual(["login:phone:01411234567", `login:${m.email}`]);
    // A refused account key stops the attempt before the password is checked.
    vi.mocked(security.consumeRateLimit).mockImplementation((key) => key !== `login:${m.email}`);
    try {
      await expect(authorizeCredentials({ email: "+8801411234567", password: PASSWORD })).rejects.toThrow(/Too many sign-in attempts/);
    } finally {
      vi.mocked(security.consumeRateLimit).mockImplementation(() => true);
    }
  });
});

describe("loginIdentifier", () => {
  it("reads an email, a mobile number, or neither", () => {
    expect(loginIdentifier(" A@Example.TEST ")).toMatchObject({ kind: "email", value: "a@example.test" });
    expect(loginIdentifier("+880 1711 234567")).toMatchObject({ kind: "phone", value: "01711234567", rateLimitKey: "login:phone:01711234567" });
    expect(loginIdentifier("hello").kind).toBe("invalid");
  });
});
