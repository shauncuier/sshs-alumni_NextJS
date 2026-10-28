import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "./helpers/db";
import { makeImage, makePdf } from "./helpers/images";
import { verifiedEmailToken, verifiedPhoneToken } from "./helpers/phone";

const sms = vi.hoisted(() => ({ sent: 0, fail: false }));
vi.mock("@/lib/bulksmsbd", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bulksmsbd")>();
  return {
    ...actual,
    sendBulkSms: async (args: { numbers: string[] }) => {
      sms.sent += 1;
      return sms.fail
        ? { success: false, isSimulated: false, responseCode: 1007, totalNumbers: 1, validNumbers: [], invalidNumbers: [], error: "Insufficient balance" }
        : { success: true, isSimulated: false, responseCode: 202, totalNumbers: 1, validNumbers: args.numbers, invalidNumbers: [] };
    },
  };
});
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return { ...actual, getEmailProvider: () => "resend", sendEmail: async () => ({ success: true, messageId: "m1" }) };
});
const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string; status?: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return {
    ...actual,
    getSessionUser: async () => session.user,
    getMemberSession: async () => (session.user ? { user: session.user } : null),
  };
});

import { canonicalPhone, phoneTaken } from "@/lib/phone-registry";
import { requestPhoneOtp, resetSmsOutage } from "@/lib/phone-otp";
import { requestEmailOtp } from "@/lib/email-otp";
import { registerForEvent } from "./helpers/register";
import { createUser } from "@/lib/admin/users";
import { PUT as updateProfile } from "@/app/api/profile/route";

beforeEach(async () => {
  sms.sent = 0;
  sms.fail = false;
  session.user = null;
  resetSmsOutage();
  await resetDatabase();
});

const withPhone = async (phone: string) => {
  const m = await makeMember();
  await prisma.alumniProfile.update({ where: { userId: m.id }, data: { phone } });
  return m;
};

const join = async (email: string, contact: { phoneVerificationToken?: string; emailVerificationToken?: string; phone?: string }) =>
  registerForEvent({
    slug: "jubilee",
    sessionUserId: null,
    photo: await makeImage(800, 800),
    proof: { type: "SSC_CERTIFICATE", file: makePdf() },
    account: { fullName: "New Member", email, password: "Member-Pw-2026", sscBatch: 2001, dateOfBirth: "1985-06-15", ...contact },
    rsvp: { paymentMethod: "bKash", transactionId: `TRX${Math.random().toString(36).slice(2, 10)}` },
  });

describe("one mobile number, one account", () => {
  it("matches a number however it is written", async () => {
    expect(canonicalPhone("+880 1711-000111")).toBe("01711000111");
    await withPhone("+8801711000111");
    expect(await phoneTaken("01711000111")).toBe(true);
    expect(await phoneTaken("8801711000222")).toBe(false);
  });

  it("sends no SMS code to a number another account has, but lets a member re-verify their own", async () => {
    const owner = await withPhone("01711000111");
    await expect(requestPhoneOtp("+880 1711 000111")).rejects.toMatchObject({ status: 409, code: "PHONE_TAKEN" });
    expect(sms.sent).toBe(0);
    await expect(requestPhoneOtp("01711000111", Date.now(), { exceptUserId: owner.id })).resolves.toBeTruthy();
  });

  it("refuses to join with a number another account has", async () => {
    await makeEvent({ slug: "jubilee", isMembershipEvent: true, registrationFee: 1500, paymentInstructions: "bKash" });
    await withPhone("01711000111");
    await expect(join("new@example.test", { phoneVerificationToken: verifiedPhoneToken("8801711000111") })).rejects.toMatchObject({
      status: 409,
      code: "PHONE_TAKEN",
    });
    expect(await prisma.user.count({ where: { email: "new@example.test" } })).toBe(0);
  });

  it("an admin cannot add a member with a used number either", async () => {
    await withPhone("01711000111");
    const admin = { id: "a", email: "admin@example.test", role: "ADMIN" };
    await expect(
      createUser(admin, { fullName: "X", email: "x@example.test", password: "Member-Pw-2026", role: "ALUMNI", sscBatch: 2001, phone: "+8801711000111" })
    ).rejects.toMatchObject({ status: 409, code: "PHONE_TAKEN" });
    const row = await createUser(admin, { fullName: "Y", email: "y@example.test", password: "Member-Pw-2026", role: "ALUMNI", sscBatch: 2001, phone: "+880 1711 000222" });
    expect(row.phone).toBe("01711000222");
  });
});

describe("the number must be verified", () => {
  it("email codes are only offered while the SMS service is down", async () => {
    await expect(requestEmailOtp("new@example.test")).rejects.toMatchObject({ status: 409, code: "SMS_WORKING" });
    sms.fail = true;
    await expect(requestPhoneOtp("01711000333")).rejects.toMatchObject({ code: "SMS_FAILED" });
    await expect(requestEmailOtp("new@example.test")).resolves.toMatchObject({ email: "new@example.test" });
    // SMS works again: back to SMS only.
    sms.fail = false;
    await requestPhoneOtp("01711000444");
    await expect(requestEmailOtp("other@example.test")).rejects.toMatchObject({ code: "SMS_WORKING" });
  });

  it("joining by email code still needs a valid, unused number", async () => {
    await makeEvent({ slug: "jubilee", isMembershipEvent: true, registrationFee: 1500, paymentInstructions: "bKash" });
    await withPhone("01711000111");
    const token = verifiedEmailToken("new@example.test");
    await expect(join("new@example.test", { emailVerificationToken: token, phone: "12345" })).rejects.toMatchObject({ code: "INVALID_PHONE" });
    await expect(join("new@example.test", { emailVerificationToken: token, phone: "01711000111" })).rejects.toMatchObject({ code: "PHONE_TAKEN" });
    await join("new@example.test", { emailVerificationToken: token, phone: "+880 1711 000555" });
    const p = await prisma.alumniProfile.findFirstOrThrow({ where: { user: { email: "new@example.test" } } });
    expect(p.phone).toBe("01711000555");
  });

  it("changing the number on the profile needs the SMS code, and the number must be free", async () => {
    const me = await withPhone("01711000111");
    await withPhone("01711000222");
    session.user = { id: me.id, email: me.email, role: "ALUMNI", status: "VERIFIED" };
    const put = (body: unknown) =>
      updateProfile(new Request("http://x/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

    // Same number in another format: nothing to verify.
    expect((await put({ phone: "+880 1711-000111", bio: "hi" })).status).toBe(200);
    expect((await put({ phone: "01711000999" })).status).toBe(400);
    expect((await put({ phone: "01711000999", phoneVerificationToken: verifiedPhoneToken("8801711000888") })).status).toBe(400);
    expect((await put({ phone: "01711000222", phoneVerificationToken: verifiedPhoneToken("8801711000222") })).status).toBe(409);
    expect((await put({ phone: "01711000999", phoneVerificationToken: verifiedPhoneToken("8801711000999") })).status).toBe(200);
    expect((await prisma.alumniProfile.findUniqueOrThrow({ where: { userId: me.id } })).phone).toBe("01711000999");
  });

  it("the database itself refuses two accounts with one number", async () => {
    await withPhone("01711000111");
    await expect(withPhone("01711000111")).rejects.toMatchObject({ code: "P2002" });
  });
});
