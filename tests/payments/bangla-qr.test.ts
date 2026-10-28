import { describe, expect, it } from "vitest";
import { checkSms, matchLine, normalizeLast4, normalizeMerchantTrxId, normalizePaidAt, parseWalletSms, smsTime } from "@/lib/payments/bangla-qr";

// The two OK Wallet SMS from the committee's phone, line breaks as the phone shows them.
const SMS_NIGHT = `(OK Wallet)
Payment received
TK 1250 from
BANQR A/C
0182***5517 is
successful.
Balance TK 5800.
TrxID
72610280154891
at 28/10/26 23:29`;
const SMS_EVENING = "(OK Wallet) Payment received TK 1250 from BANQR A/C 0189***8951 is successful. Balance TK 1250. TrxID 72610280154225 at 28/10/26 18:43";

describe("reading the OK Wallet SMS", () => {
  it("finds the amount, the paying account, the TrxID and the time (Dhaka)", () => {
    const sms = parseWalletSms(SMS_NIGHT);
    expect(sms).toMatchObject({ amount: 1250, accountMasked: "0182***5517", last4: "5517", trxId: "72610280154891" });
    expect(sms.at?.toISOString()).toBe("2026-10-28T17:29:00.000Z"); // 23:29 in Dhaka
    expect(smsTime(sms.at!)).toBe("28/10/26 23:29");
    expect(parseWalletSms(SMS_EVENING)).toMatchObject({ amount: 1250, last4: "8951", trxId: "72610280154225" });
  });

  it("returns nulls for text that is not such an SMS", () => {
    expect(parseWalletSms("hello")).toEqual({ amount: null, accountMasked: null, last4: null, trxId: null, at: null });
  });

  it("matches the applicant's payment by amount, last 4 digits and time, never by their app's ID", () => {
    // The applicant's receipt: ৳1,250, ID 000AT941, 28 Oct 2026 11:29 PM, paid from …5517.
    const payment = { amount: 1250, last4: "5517", paidAt: "2026-10-28T17:29:00.000Z" };
    expect(matchLine(payment)).toBe("TK 1,250 from …5517 at 28/10/26 23:29");
    expect(checkSms(parseWalletSms(SMS_NIGHT), payment)).toEqual({ amount: true, last4: true, time: true });
    // The other SMS is someone else's payment: same amount, different account and time.
    expect(checkSms(parseWalletSms(SMS_EVENING), payment)).toEqual({ amount: true, last4: false, time: false });
    // An older registration without last 4 digits can only be checked on amount and time.
    expect(checkSms(parseWalletSms(SMS_NIGHT), { ...payment, last4: null })).toEqual({ amount: true, last4: null, time: true });
  });
});

describe("what the member and the admin type", () => {
  it("takes exactly 4 digits, spaces allowed", () => {
    expect(normalizeLast4(" 55 17")).toBe("5517");
    for (const bad of ["551", "55178", "abcd", "", null]) expect(() => normalizeLast4(bad)).toThrow(expect.objectContaining({ code: "INVALID_ACCOUNT_DIGITS" }));
  });

  it("takes a payment time from the last 60 days, not the future", () => {
    const now = new Date("2026-10-29T00:00:00Z");
    expect(normalizePaidAt("2026-10-28T17:29:00Z", now).toISOString()).toBe("2026-10-28T17:29:00.000Z");
    for (const bad of ["", "tomorrow", "2026-11-01T00:00:00Z", "2026-07-01T00:00:00Z"]) {
      expect(() => normalizePaidAt(bad, now)).toThrow(expect.objectContaining({ code: "INVALID_PAYMENT_TIME" }));
    }
  });

  it("stores the SMS TrxID in capitals without spaces", () => {
    expect(normalizeMerchantTrxId(" 7261 0280154891 ")).toBe("72610280154891");
    expect(() => normalizeMerchantTrxId("")).toThrow(expect.objectContaining({ code: "MERCHANT_TRX_REQUIRED" }));
  });
});
