import { describe, expect, it } from "vitest";
import { computeFee, formatTaka, isPaidEvent, normalizePackages, parseTaka } from "@/lib/events/pricing";

// The Golden Jubilee's real prices ("Jubilee price model").
const jubilee = {
  registrationFee: 0,
  extraAdultFee: 500,
  childFee: 300,
  packages: normalizePackages([
    { name: "General Alumnus Delegate", price: "৳1,000", adults: 1 },
    { name: "Alumnus + Spouse / Extra Guest", price: "৳1,500", adults: 2 },
    { name: "Family (Alumnus + Spouse + 1 Child < 12yr)", price: "৳1,800", adults: 2, children: 1 },
    { name: "Golden Patron & Sponsor", price: "৳5,000", adults: 1, guestsFree: true },
  ]),
};

describe("parseTaka / formatTaka", () => {
  it("reads display prices and numbers", () => {
    expect(parseTaka("৳1,500")).toBe(1500);
    expect(parseTaka(2000)).toBe(2000);
    expect(parseTaka("Free")).toBe(0);
    expect(parseTaka(-5)).toBeNaN();
    expect(parseTaka(null)).toBeNaN();
  });
  it("formats amounts", () => {
    expect(formatTaka(1500)).toBe("৳1,500");
    expect(formatTaka(0)).toBe("Free");
  });
});

describe("computeFee (Jubilee model)", () => {
  it("prices General with one extra adult like the Spouse package", () => {
    const a = computeFee(jubilee, { packageName: "General Alumnus Delegate", extraAdults: 1 });
    const b = computeFee(jubilee, { packageName: "Alumnus + Spouse / Extra Guest" });
    expect([a.fee, a.headCount]).toEqual([1500, 2]);
    expect([b.fee, b.headCount]).toEqual([1500, 2]);
  });
  it("prices the Family package as General + adult + child", () => {
    expect(computeFee(jubilee, { packageName: "Family (Alumnus + Spouse + 1 Child < 12yr)" })).toMatchObject({ fee: 1800, headCount: 3 });
  });
  it("lets Patron bring extra guests free", () => {
    expect(computeFee(jubilee, { packageName: "Golden Patron & Sponsor", extraAdults: 2, extraChildren: 1 })).toMatchObject({ fee: 5000, headCount: 4 });
  });
  it("adds the optional donation to the total, not the fee", () => {
    expect(computeFee(jubilee, { packageName: "General Alumnus Delegate", donationAmount: 700 })).toMatchObject({ fee: 1000, donation: 700, total: 1700 });
  });
  it("uses registrationFee when an event has no packages", () => {
    expect(computeFee({ registrationFee: 200, extraAdultFee: 100, childFee: 0, packages: [] }, { extraAdults: 1 })).toMatchObject({ fee: 300, headCount: 2 });
  });
  it("rejects unknown packages, bad guest counts and bad donations", () => {
    expect(() => computeFee(jubilee, { packageName: "VIP" })).toThrow(/choose one of the event's packages/);
    expect(() => computeFee(jubilee, { packageName: "General Alumnus Delegate", extraAdults: 11 })).toThrow(/between 0 and 10/);
    expect(() => computeFee(jubilee, { packageName: "General Alumnus Delegate", extraAdults: 1.5 })).toThrow();
    expect(() => computeFee(jubilee, { packageName: "General Alumnus Delegate", donationAmount: -1 })).toThrow(/donation/);
  });
});

it("knows whether an event is paid", () => {
  expect(isPaidEvent(jubilee)).toBe(true);
  expect(isPaidEvent({ registrationFee: 0, extraAdultFee: 0, childFee: 0, packages: [] })).toBe(false);
});
