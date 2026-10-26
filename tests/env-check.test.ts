import { describe, expect, it } from "vitest";
import { checkProductionEnv } from "@/lib/env-check";

const good = {
  DATABASE_URL: "mysql://app:pw@db.internal:3306/sshs",
  NEXTAUTH_SECRET: "k".repeat(44),
  NEXTAUTH_URL: "https://alumni.example.org",
  NEXT_PUBLIC_APP_URL: "https://alumni.example.org",
  SUPER_ADMIN_EMAIL: "chief@example.org",
  SUPER_ADMIN_PASSWORD: "Long-Enough-Pw-1",
  RESEND_API_KEY: "re_x",
  RESEND_FROM_EMAIL: "Praktan Sabujian Parishad <noreply@alumni.example.org>",
  BULKSMSBD_API_KEY: "k",
  BULKSMSBD_SENDER_ID: "8800000000000",
  CONTACT_INBOX_EMAIL: "committee@example.org",
  NEXT_PUBLIC_DONATION_INSTRUCTIONS: "bKash: 01700000000",
  NEXT_PUBLIC_BANGLA_QR_IMAGE: "/bangla-qr.png",
  UPLOADS_DIR: "/var/lib/ssghs/uploads",
  ONLINE_PAYMENTS_ENABLED: "false",
};

describe("production environment check", () => {
  it("passes a complete production environment", () => {
    expect(checkProductionEnv(good)).toEqual({ errors: [], warnings: [] });
  });

  it("refuses a missing, short or published secret", () => {
    expect(checkProductionEnv({ ...good, NEXTAUTH_SECRET: "" }).errors).toEqual([expect.stringContaining("NEXTAUTH_SECRET is not set")]);
    expect(checkProductionEnv({ ...good, NEXTAUTH_SECRET: "short" }).errors).toEqual([expect.stringContaining("too short")]);
    expect(checkProductionEnv({ ...good, NEXTAUTH_SECRET: "sabuj-shikshayatan-alumni-production-secret-key-2026" }).errors).toEqual([expect.stringContaining("published example")]);
  });

  it("requires matching https addresses that are not local", () => {
    expect(checkProductionEnv({ ...good, NEXTAUTH_URL: "http://alumni.example.org" }).errors).toEqual([expect.stringContaining("NEXTAUTH_URL must be")]);
    expect(checkProductionEnv({ ...good, NEXT_PUBLIC_APP_URL: "https://other.example.org" }).errors).toEqual([expect.stringContaining("same address")]);
    expect(checkProductionEnv({ ...good, NEXTAUTH_URL: "https://localhost:3000", NEXT_PUBLIC_APP_URL: "https://localhost:3000" }).errors).toHaveLength(2);
  });

  it("requires the super admin and manual payments only", () => {
    const r = checkProductionEnv({ ...good, SUPER_ADMIN_EMAIL: "", SUPER_ADMIN_PASSWORD: "short", ONLINE_PAYMENTS_ENABLED: "true" });
    expect(r.errors).toEqual([
      expect.stringContaining("SUPER_ADMIN_EMAIL"),
      expect.stringContaining("SUPER_ADMIN_PASSWORD"),
      expect.stringContaining("ONLINE_PAYMENTS_ENABLED"),
    ]);
  });

  it("warns when Resend would send from an unverified free-mail or test address", () => {
    for (const from of ["Praktan Sabujian Parishad <onboarding@resend.dev>", "SSGHS <someone@gmail.com>", ""]) {
      expect(checkProductionEnv({ ...good, RESEND_FROM_EMAIL: from }).warnings).toEqual([expect.stringContaining("not on a domain verified in Resend")]);
    }
  });

  it("is happy with Gmail over SMTP, and says which SMTP setting is missing", () => {
    const gmail = { EMAIL_PROVIDER: "smtp", SMTP_HOST: "smtp.gmail.com", SMTP_USER: "association@gmail.com", SMTP_PASS: "app-password" };
    // Sending through Gmail: the unverified Resend sender no longer matters.
    expect(checkProductionEnv({ ...good, ...gmail, RESEND_FROM_EMAIL: "x <onboarding@resend.dev>" }).warnings).toEqual([]);
    const r = checkProductionEnv({ ...good, ...gmail, SMTP_PASS: "" });
    expect(r.warnings).toEqual([expect.stringContaining("SMTP_PASS is not set")]);
    expect(JSON.stringify(r)).not.toContain("app-password");
  });

  it("warns about test settings and features that will not work, without printing values", () => {
    const r = checkProductionEnv({ ...good, SEED_ADMIN_PASSWORD: "Secret-Value-123", RESEND_API_KEY: "", UPLOADS_DIR: "./uploads" });
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([
      expect.stringContaining("SEED_ADMIN_PASSWORD"),
      expect.stringContaining("No email provider"),
      expect.stringContaining("UPLOADS_DIR"),
    ]);
    expect(JSON.stringify(r)).not.toContain("Secret-Value-123");
  });
});
