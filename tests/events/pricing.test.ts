import { describe, expect, it } from "vitest";
import { computeFee, formatTaka, isPaidEvent, normalizeGuestTypes, normalizePackages, parseTaka, storedGuests } from "@/lib/events/pricing";

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

describe("guest types", () => {
  // Golden Jubilee 2026: member 1,500; spouse 700 (one); child 500.
  const jubilee2026 = {
    registrationFee: 1500,
    extraAdultFee: 0,
    childFee: 0,
    packages: [],
    guestTypes: normalizeGuestTypes([
      { name: "Spouse", price: 700, max: 1 },
      { name: "Child", price: "৳500", max: 5 },
    ]),
  };

  it("adds each guest at the price of their type", () => {
    expect(computeFee(jubilee2026, {})).toMatchObject({ fee: 1500, headCount: 1, guests: [] });
    expect(computeFee(jubilee2026, { guests: { Spouse: 1, Child: 2 } })).toMatchObject({
      fee: 1500 + 700 + 2 * 500,
      headCount: 4,
      guests: [
        { name: "Spouse", count: 1, price: 700 },
        { name: "Child", count: 2, price: 500 },
      ],
    });
  });

  it("enforces each type's limit and refuses unknown types", () => {
    expect(() => computeFee(jubilee2026, { guests: { Spouse: 2 } })).toThrow(/between 0 and 1/);
    expect(() => computeFee(jubilee2026, { guests: { Child: -1 } })).toThrow(/between 0 and 5/);
    expect(() => computeFee(jubilee2026, { guests: { Cousin: 1 } })).toThrow(/not a guest option/);
    // The older extra-adult counts do not apply once guest types are set.
    expect(computeFee(jubilee2026, { extraAdults: 3 })).toMatchObject({ fee: 1500, headCount: 1 });
  });

  it("cleans admin input: names required and unique, limits kept in range", () => {
    expect(
      normalizeGuestTypes([
        { name: " Spouse ", price: 700, max: 1 },
        { name: "spouse", price: 1 },
        { name: "", price: 5 },
        { name: "Child", price: 500, max: 99 },
        { name: "Bad", price: -3 },
      ])
    ).toEqual([
      { name: "Spouse", price: 700, max: 1 },
      { name: "Child", price: 500, max: 10 },
    ]);
  });

  it("still reads the older extra-adult / child pair through guest names", () => {
    const old = { registrationFee: 200, extraAdultFee: 100, childFee: 50, packages: [] };
    expect(computeFee(old, { guests: { "Extra adult": 1, "Child under 12": 2 } })).toMatchObject({ fee: 400, extraAdults: 1, extraChildren: 2 });
  });

  it("reads guests stored on registrations, old and new", () => {
    expect(storedGuests({ guests: [{ name: "Spouse", count: 1, price: 700 }], extraAdults: 0, extraChildren: 0 })).toEqual([{ name: "Spouse", count: 1, price: 700 }]);
    expect(storedGuests({ guests: [], extraAdults: 2, extraChildren: 0 })).toEqual([{ name: "Extra adult", count: 2, price: 0 }]);
  });
});
