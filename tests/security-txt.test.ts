import { describe, expect, it } from "vitest";
import { securityTxt, SECURITY_TXT_VALID_DAYS } from "@/lib/security-txt";
import { GET } from "@/app/.well-known/security.txt/route";

describe("security.txt (RFC 9116)", () => {
  it("has the required Contact and Expires fields", () => {
    const body = securityTxt(new Date("2026-11-17T15:00:00Z"));
    expect(body).toMatch(/^Contact: mailto:\S+@\S+$/m);
    expect(body).toContain("Expires: 2027-05-16T00:00:00.000Z");
    expect(body).toContain("Canonical: ");
    expect(body.endsWith("\n")).toBe(true);
  });

  it("expires less than a year ahead", () => {
    const now = new Date();
    const match = securityTxt(now).match(/^Expires: (.+)$/m);
    const days = (new Date(match?.[1] ?? "").getTime() - now.getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(SECURITY_TXT_VALID_DAYS - 1);
    expect(days).toBeLessThan(365);
  });

  it("is served as plain text", async () => {
    const res = GET();
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(await res.text()).toContain("Contact: mailto:");
  });
});
