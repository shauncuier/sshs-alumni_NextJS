import { describe, expect, it } from "vitest";
import { BLOOD_GROUPS, normalizeBloodGroup } from "@/lib/members/blood-groups";

describe("blood group (optional)", () => {
  it("reads the usual ways of writing it", () => {
    expect(BLOOD_GROUPS).toHaveLength(8);
    expect(normalizeBloodGroup("ab +")).toBe("AB+");
    expect(normalizeBloodGroup("O\u2212")).toBe("O-");
    expect(normalizeBloodGroup("o pos")).toBe("O+");
    expect(normalizeBloodGroup("B negative")).toBe("B-");
  });

  it("empty means not given; anything else is refused", () => {
    expect(normalizeBloodGroup("")).toBeNull();
    expect(normalizeBloodGroup(null)).toBeNull();
    expect(normalizeBloodGroup(undefined)).toBeNull();
    expect(normalizeBloodGroup("C+")).toBeUndefined();
    expect(normalizeBloodGroup(5)).toBeUndefined();
  });
});
