import { beforeEach, describe, expect, it, vi } from "vitest";

const sms = vi.hoisted(() => ({ sent: [] as { numbers: string[]; message: string }[], fail: false }));
vi.mock("@/lib/bulksmsbd", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bulksmsbd")>();
  return {
    ...actual,
    sendBulkSms: async (args: { numbers: string[]; message: string }) => {
      sms.sent.push(args);
      return sms.fail
        ? { success: false, isSimulated: false, responseCode: 1007, totalNumbers: 1, validNumbers: [], invalidNumbers: [], error: "Insufficient balance" }
        : { success: true, isSimulated: false, responseCode: 202, totalNumbers: 1, validNumbers: args.numbers, invalidNumbers: [] };
    },
  };
});

import { OTP_MAX_ATTEMPTS, OTP_TTL_MS, VERIFIED_TTL_MS, readVerifiedPhone, requestPhoneOtp, verifyPhoneOtp } from "@/lib/phone-otp";
import { OTP_LENGTH } from "@/lib/phone-otp-format";
import { POST as sendRoute } from "@/app/api/auth/phone-otp/route";
import { POST as verifyRoute } from "@/app/api/auth/phone-otp/verify/route";

beforeEach(() => {
  sms.sent = [];
  sms.fail = false;
});

const lastCode = () => /OTP is (\d+)$/.exec(sms.sent.at(-1)!.message)![1];
const wrong = (code: string) => String((Number(code) + 1) % 10 ** OTP_LENGTH).padStart(OTP_LENGTH, "0");

describe("requestPhoneOtp", () => {
  it("texts the code in the gateway's OTP template to the normalized number", async () => {
    const res = await requestPhoneOtp("+880 1711-000111");
    expect(res.phone).toBe("01711000111");
    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0].numbers).toEqual(["8801711000111"]);
    expect(sms.sent[0].message).toMatch(/^Your SSGHS Alumni OTP is \d{4}$/);
  });

  it("refuses numbers that are not Bangladeshi mobiles", async () => {
    for (const phone of ["", "12345", "+44 7700 900123", "01211000111", 42]) {
      await expect(requestPhoneOtp(phone)).rejects.toMatchObject({ status: 400, code: "INVALID_PHONE" });
    }
    expect(sms.sent).toHaveLength(0);
  });

  it("reports a gateway failure", async () => {
    sms.fail = true;
    await expect(requestPhoneOtp("01711000111")).rejects.toMatchObject({ status: 502, code: "SMS_FAILED" });
  });
});

describe("verifyPhoneOtp", () => {
  it("issues a verified-phone token for the right code", async () => {
    const { challenge } = await requestPhoneOtp("01711000111");
    const res = verifyPhoneOtp(challenge, ` ${lastCode()} `);
    expect(res.phone).toBe("01711000111");
    expect(readVerifiedPhone(res.verificationToken)).toBe("01711000111");
  });

  it("refuses a wrong code and locks the challenge after too many tries", async () => {
    const { challenge } = await requestPhoneOtp("01711000111");
    const code = lastCode();
    for (let i = 1; i < OTP_MAX_ATTEMPTS; i++) {
      expect(() => verifyPhoneOtp(challenge, wrong(code))).toThrow(expect.objectContaining({ code: "OTP_WRONG" }));
    }
    expect(() => verifyPhoneOtp(challenge, wrong(code))).toThrow(expect.objectContaining({ code: "OTP_LOCKED", status: 429 }));
    // Even the right code no longer works on a locked challenge.
    expect(() => verifyPhoneOtp(challenge, code)).toThrow(expect.objectContaining({ code: "OTP_LOCKED" }));
  });

  it("refuses an expired or forged challenge", async () => {
    const now = Date.now();
    const { challenge } = await requestPhoneOtp("01711000111", now);
    expect(() => verifyPhoneOtp(challenge, lastCode(), now + OTP_TTL_MS)).toThrow(expect.objectContaining({ code: "OTP_EXPIRED" }));
    expect(() => verifyPhoneOtp("not-a-token", "123456")).toThrow(expect.objectContaining({ code: "OTP_INVALID" }));
    expect(() => verifyPhoneOtp(undefined, "123456")).toThrow(expect.objectContaining({ code: "OTP_INVALID" }));
  });
});

describe("readVerifiedPhone", () => {
  it("refuses missing, forged and expired tokens", async () => {
    const { challenge } = await requestPhoneOtp("01711000111");
    const { verificationToken } = verifyPhoneOtp(challenge, lastCode());
    for (const token of [undefined, null, "", "forged", challenge]) {
      expect(() => readVerifiedPhone(token)).toThrow(expect.objectContaining({ code: "PHONE_NOT_VERIFIED" }));
    }
    expect(() => readVerifiedPhone(verificationToken, Date.now() + VERIFIED_TTL_MS + 1)).toThrow(
      expect.objectContaining({ code: "PHONE_NOT_VERIFIED" })
    );
  });
});

describe("phone OTP routes", () => {
  const json = (body: unknown) => new Request("http://x/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  it("sends and verifies a code end to end", async () => {
    const sent = await sendRoute(json({ phone: "01711000111" }));
    expect(sent.status).toBe(200);
    const { challenge } = await sent.json();
    const verified = await verifyRoute(json({ challenge, code: lastCode() }));
    expect(verified.status).toBe(200);
    expect(readVerifiedPhone((await verified.json()).verificationToken)).toBe("01711000111");
  });

  it("answers bad input with a 400", async () => {
    expect((await sendRoute(json({ phone: "nope" }))).status).toBe(400);
    expect((await sendRoute(new Request("http://x/api", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await verifyRoute(json({ challenge: "x", code: "1" }))).status).toBe(400);
  });
});
