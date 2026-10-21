import { describe, expect, it } from "vitest";
import { eventDateLabel, eventDateLabelBn, eventDateShort } from "@/lib/events/date-label";

describe("event date labels", () => {
  it("shows a fixed date in full and a tentative one as approximate", () => {
    expect(eventDateLabel("2026-12-26", false)).toBe("Saturday, 26 December 2026");
    expect(eventDateLabel("2026-12-26", true)).toBe("Around 26 December 2026 (date to be confirmed)");
    expect(eventDateShort("2026-12-26", false)).toBe("26 Dec 2026");
    expect(eventDateShort("2026-12-26", true)).toBe("~26 Dec 2026 (approx.)");
    expect(eventDateLabelBn("2026-12-26", true)).toContain("আনুমানিক");
    expect(eventDateLabelBn("2026-12-26", true)).toContain("চূড়ান্ত হয়নি");
  });

  it("keeps the Dhaka calendar day for a stored date-time", () => {
    // Seeded as 9 AM in Dhaka, which is 03:00 UTC the same day.
    expect(eventDateShort(new Date("2026-12-26T03:00:00.000Z"), false)).toBe("26 Dec 2026");
    // 11 PM in Dhaka is 17:00 UTC: still the 26th there.
    expect(eventDateShort(new Date("2026-12-26T17:00:00.000Z"), false)).toBe("26 Dec 2026");
  });
});
