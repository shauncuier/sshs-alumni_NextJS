import { expect, it } from "vitest";
import { createCardToken, verifyCardToken } from "@/lib/id-card";

const payload = { alumniId: "SSGHS-ALM-2008-ABC123", fullName: "Test", sscBatch: 2008, membershipTier: "LIFETIME" as const, issuedAt: Date.now() };

it("still issues and verifies card tokens", () => {
  expect(verifyCardToken(createCardToken(payload))).toMatchObject({ valid: true, payload: { fullName: "Test", eiin: "105070" } });
});

it("reports forged and outdated cards as before", () => {
  expect(verifyCardToken("x".repeat(60)).error).toMatch(/forged/);
  expect(verifyCardToken("abc.def").error).toMatch(/outdated QR format/);
});
