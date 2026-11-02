import { describe, expect, it } from "vitest";
import { isPrivatePath } from "@/lib/analytics-paths";

describe("pages Clarity must not record", () => {
  it("skips the admin panel and members' private pages, records the public ones", () => {
    for (const p of ["/admin", "/admin/verifications", "/profile", "/settings", "/dashboard", "/messages", "/gate", "/slip/abc", "/print/finance", "/verify/tok", "/card", "/notifications"]) {
      expect(isPrivatePath(p)).toBe(true);
    }
    for (const p of ["/", "/events", "/events/golden-jubilee", "/alumni", "/alumni/rafiq-2001", "/contact", "/administration", "/profiles"]) {
      expect(isPrivatePath(p)).toBe(false);
    }
  });
});
