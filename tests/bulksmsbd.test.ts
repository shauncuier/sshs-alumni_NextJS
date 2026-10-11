import { describe, it, expect } from "vitest";
import {
  normalizeBdPhoneNumber,
  isValidBdMobile,
  isUnicodeText,
  calculateSmsMetrics,
  sendBulkSms,
  checkBulkSmsBalance,
} from "@/lib/bulksmsbd";

describe("BulkSMSBD phone number normalization", () => {
  it("normalizes phone with +880 and spaces/dashes", () => {
    expect(normalizeBdPhoneNumber("+880 1819-987654")).toBe("8801819987654");
    expect(normalizeBdPhoneNumber("+880 1711-234567")).toBe("8801711234567");
  });

  it("normalizes standard 11-digit local format starting with 01", () => {
    expect(normalizeBdPhoneNumber("01819987654")).toBe("8801819987654");
    expect(normalizeBdPhoneNumber("01711234567")).toBe("8801711234567");
  });

  it("normalizes 10-digit format starting with 1", () => {
    expect(normalizeBdPhoneNumber("1819987654")).toBe("8801819987654");
  });

  it("retains already normalized 8801 format", () => {
    expect(normalizeBdPhoneNumber("8801819987654")).toBe("8801819987654");
  });

  it("rejects invalid characters or wrong lengths", () => {
    expect(normalizeBdPhoneNumber("12345")).toBeNull();
    expect(normalizeBdPhoneNumber("not-a-number")).toBeNull();
    expect(normalizeBdPhoneNumber("")).toBeNull();
  });
});

describe("BulkSMSBD mobile operator validation", () => {
  it("validates legitimate Bangladeshi mobile operators", () => {
    expect(isValidBdMobile("8801711234567")).toBe(true); // Grameenphone
    expect(isValidBdMobile("8801311234567")).toBe(true); // GP (013)
    expect(isValidBdMobile("8801819987654")).toBe(true); // Robi
    expect(isValidBdMobile("8801612445566")).toBe(true); // Airtel
    expect(isValidBdMobile("8801912456789")).toBe(true); // Banglalink
    expect(isValidBdMobile("8801412456789")).toBe(true); // Banglalink (014)
    expect(isValidBdMobile("8801512456789")).toBe(true); // Teletalk
  });

  it("rejects non-mobile or foreign numbers", () => {
    expect(isValidBdMobile("8801211234567")).toBe(false); // Invalid operator prefix
    expect(isValidBdMobile("8801111234567")).toBe(false); // Citycell defunct
    expect(isValidBdMobile("1234567890123")).toBe(false);
  });
});

describe("BulkSMSBD SMS metrics and charset calculation", () => {
  it("detects English GSM-7 text correctly", () => {
    const text = "SSGHS Grand Reunion 2026. Register now at sabujsghs.edu.bd!";
    expect(isUnicodeText(text)).toBe(false);
    const metrics = calculateSmsMetrics(text);
    expect(metrics.isUnicode).toBe(false);
    expect(metrics.partsCount).toBe(1);
    expect(metrics.charsRemainingInPart).toBe(160 - text.length);
  });

  it("detects Bangla Unicode text and splits at 70 characters", () => {
    const banglaText = "শুভ পুনর্মিলনী ২০২৬! প্রিয় প্রাক্তন শিক্ষার্থী, সবুজের আঙিনায় স্বাগতম।";
    expect(isUnicodeText(banglaText)).toBe(true);
    const metrics = calculateSmsMetrics(banglaText);
    expect(metrics.isUnicode).toBe(true);
    expect(metrics.partsCount).toBe(banglaText.length <= 70 ? 1 : Math.ceil(banglaText.length / 67));
  });
});

describe("BulkSMSBD sandbox dispatch and balance", () => {
  it("provides sandbox balance when not configured in test env", async () => {
    const res = await checkBulkSmsBalance();
    expect(res.success).toBe(true);
    expect(res.balance).toBe("500.00");
    expect(res.isSimulated).toBe(true);
  });

  it("simulates bulk send successfully and filters invalid numbers", async () => {
    const res = await sendBulkSms({
      numbers: [
        "+880 1819-987654",
        "01711234567",
        "invalid-number-123",
      ],
      message: "Test Reunion Notification",
    });

    expect(res.success).toBe(true);
    expect(res.isSimulated).toBe(true);
    expect(res.validNumbers).toHaveLength(2);
    expect(res.invalidNumbers).toHaveLength(1);
    expect(res.validNumbers).toContain("8801819987654");
    expect(res.validNumbers).toContain("8801711234567");
  });
});
