import { beforeEach, describe, expect, it, vi } from "vitest";

const mail = vi.hoisted(() => ({ sent: [] as { to: string; subject: string; text?: string }[], fail: false }));
vi.mock("@/lib/email", () => ({
  getEmailProvider: () => "resend",
  sendEmail: async (payload: { to: string; subject: string; text?: string }) => {
    mail.sent.push(payload);
    return mail.fail ? { success: false, error: "provider down" } : { success: true, messageId: "m1" };
  },
}));

import { readVerifiedEmail, requestEmailOtp, verifyEmailOtp } from "@/lib/email-otp";
import { readVerifiedPhone } from "@/lib/phone-otp";
import { OTP_LENGTH } from "@/lib/phone-otp-format";
import { POST as sendRoute } from "@/app/api/auth/email-otp/route";
import { POST as verifyRoute } from "@/app/api/auth/email-otp/verify/route";
import { makeMember, resetDatabase } from "./helpers/db";

beforeEach(async () => {
  mail.sent = [];
  mail.fail = false;
  await resetDatabase();
});

const lastCode = () => {
  const code = /code is (\d+)\./.exec(mail.sent.at(-1)!.text!)![1];
  expect(code).toHaveLength(OTP_LENGTH);
  return code;
};

describe("email OTP", () => {
  it("emails a code to the normalized address and verifies it", async () => {
    const { challenge, email } = await requestEmailOtp("  New@Example.TEST ");
    expect(email).toBe("new@example.test");
    expect(mail.sent[0].to).toBe("new@example.test");
    const { verificationToken } = verifyEmailOtp(challenge, lastCode());
    expect(readVerifiedEmail(verificationToken)).toBe("new@example.test");
  });

  it("keeps email and phone tokens apart", async () => {
    const { challenge } = await requestEmailOtp("new@example.test");
    const { verificationToken } = verifyEmailOtp(challenge, lastCode());
    expect(() => readVerifiedPhone(verificationToken)).toThrow(expect.objectContaining({ code: "PHONE_NOT_VERIFIED" }));
  });

  it("refuses bad addresses, existing accounts and provider failures", async () => {
    await expect(requestEmailOtp("not-an-email")).rejects.toMatchObject({ status: 400, code: "INVALID_EMAIL" });
    await makeMember({ email: "taken@example.test" });
    await expect(requestEmailOtp("Taken@example.test")).rejects.toMatchObject({ status: 409, code: "EMAIL_EXISTS" });
    mail.fail = true;
    await expect(requestEmailOtp("other@example.test")).rejects.toMatchObject({ status: 502, code: "EMAIL_FAILED" });
    expect(readVerifiedEmail("forged")).toBeNull();
  });

  it("works end to end through the routes", async () => {
    const json = (body: unknown) => new Request("http://x/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const sent = await sendRoute(json({ email: "route@example.test" }));
    expect(sent.status).toBe(200);
    const { challenge } = await sent.json();
    const verified = await verifyRoute(json({ challenge, code: lastCode() }));
    expect(verified.status).toBe(200);
    expect(readVerifiedEmail((await verified.json()).verificationToken)).toBe("route@example.test");
  });
});
