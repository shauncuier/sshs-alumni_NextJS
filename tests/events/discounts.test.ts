import { beforeEach, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { computeFee, discountOff, normalizeGuestTypes } from "@/lib/events/pricing";
import { checkCoupon, createDiscount, discountStatus, eventDiscountOffer, listDiscounts, updateDiscount } from "@/lib/events/discounts";
import { registerForEvent } from "../helpers/register";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

beforeEach(resetDatabase);

const DAY = 24 * 3600_000;
const ymd = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

const guestTypes = normalizeGuestTypes([{ name: "Spouse", price: 500, max: 2 }]);
const paidEvent = (data: Parameters<typeof makeEvent>[0] = {}) =>
  makeEvent({ registrationFee: 1000, guestTypes: guestTypes as never, paymentInstructions: "bKash 01XXXXXXXXX", ...data });

let trx = 0;
const rsvp = (extra: Record<string, unknown> = {}) => ({
  guests: { Spouse: 1 },
  guestPeople: { Spouse: [{ name: "Spouse One" }] },
  paymentMethod: "bKash",
  transactionId: `TRX${String(++trx).padStart(6, "0")}`,
  ...extra,
});
const coupon = (data: Record<string, unknown> = {}) => createDiscount({ kind: "COUPON", code: "batch2013", label: "Batch 2013 offer", type: "AMOUNT", value: 300, ...data }, "admin@example.test");

describe("discount maths", () => {
  it("takes a percentage or an amount off, never more than the price", () => {
    expect(discountOff({ type: "PERCENT", value: 25 }, 1000)).toBe(250);
    expect(discountOff({ type: "AMOUNT", value: 300 }, 1000)).toBe(300);
    expect(discountOff({ type: "AMOUNT", value: 3000 }, 1000)).toBe(1000);
    expect(discountOff({ type: "PERCENT", value: 10 }, 0)).toBe(0);
  });

  it("lowers only the member's own price: guests pay in full", () => {
    const event = { registrationFee: 1000, extraAdultFee: 0, childFee: 0, packages: [], guestTypes };
    const price = computeFee(event, { guests: { Spouse: 2 } }, {}, { type: "PERCENT", value: 50 });
    expect(price).toMatchObject({ memberPrice: 1000, discount: 500, fee: 500 + 2 * 500 });
  });
});

describe("coupon codes", () => {
  it("applies a running coupon and records it on the registration", async () => {
    const event = await paidEvent();
    const member = await makeMember();
    await coupon();
    const { registration } = await registerForEvent({ slug: event.slug, sessionUserId: member.id, rsvp: rsvp({ couponCode: " Batch2013 " }) });
    expect(registration).toMatchObject({ totalFee: 1000 - 300 + 500, discountAmount: 300, discountCode: "BATCH2013" });
  });

  it("refuses an expired, not-yet-started, switched-off or unknown code", async () => {
    const event = await paidEvent();
    const member = await makeMember();
    await coupon({ code: "OLD", endsOn: ymd(-2) });
    await coupon({ code: "SOON", startsOn: ymd(3) });
    await coupon({ code: "OFF", isActive: false });
    for (const [code, message] of [
      ["OLD", /expired/],
      ["SOON", /works from/],
      ["OFF", /no longer valid/],
      ["NOPE", /doesn't exist/],
    ] as const) {
      await expect(registerForEvent({ slug: event.slug, sessionUserId: member.id, rsvp: rsvp({ couponCode: code }) })).rejects.toMatchObject({ code: "INVALID_COUPON", message: expect.stringMatching(message) });
    }
    expect(await prisma.eventRegistration.count()).toBe(0);
  });

  it("works on its end date and stops by itself after it", async () => {
    const event = await paidEvent();
    await coupon({ endsOn: ymd(0) });
    await expect(checkCoupon(event.slug, "BATCH2013", null)).resolves.toMatchObject({ code: "BATCH2013", type: "AMOUNT", value: 300 });
    await expect(checkCoupon(event.slug, "BATCH2013", null, new Date(Date.now() + 2 * DAY))).rejects.toMatchObject({ message: "This code has expired." });
  });

  it("stops at its maximum uses, and a cancelled registration gives its use back", async () => {
    const event = await paidEvent();
    await coupon({ maxUses: 1 });
    const [a, b] = [await makeMember(), await makeMember()];
    const first = await registerForEvent({ slug: event.slug, sessionUserId: a.id, rsvp: rsvp({ couponCode: "BATCH2013" }) });
    await expect(registerForEvent({ slug: event.slug, sessionUserId: b.id, rsvp: rsvp({ couponCode: "BATCH2013" }) })).rejects.toMatchObject({ message: "This code has been used up." });
    await prisma.eventRegistration.update({ where: { id: first.registration.id }, data: { status: "CANCELLED" } });
    await expect(registerForEvent({ slug: event.slug, sessionUserId: b.id, rsvp: rsvp({ couponCode: "BATCH2013" }) })).resolves.toBeTruthy();
  });

  it("lets each member use a code once, across events", async () => {
    const [one, two] = [await paidEvent(), await paidEvent()];
    const member = await makeMember();
    await coupon();
    await registerForEvent({ slug: one.slug, sessionUserId: member.id, rsvp: rsvp({ couponCode: "BATCH2013" }) });
    await expect(registerForEvent({ slug: two.slug, sessionUserId: member.id, rsvp: rsvp({ couponCode: "BATCH2013" }) })).rejects.toMatchObject({ message: "You have already used this code." });
  });

  it("only works for its own event", async () => {
    const [mine, other] = [await paidEvent(), await paidEvent()];
    await coupon({ eventId: mine.id });
    await expect(checkCoupon(other.slug, "BATCH2013", null)).rejects.toMatchObject({ message: "This code is for a different event." });
    await expect(checkCoupon(mine.slug, "batch2013", null)).resolves.toMatchObject({ code: "BATCH2013" });
  });

  it("can't make the membership free", async () => {
    const event = await makeEvent({ slug: "join", isMembershipEvent: true, registrationFee: 500, paymentInstructions: "bKash" });
    const member = await makeMember({ status: "PENDING" });
    await coupon({ type: "PERCENT", value: 100 });
    await expect(registerForEvent({ slug: event.slug, sessionUserId: member.id, rsvp: { paymentMethod: "bKash", transactionId: "FREE000001", couponCode: "BATCH2013" } })).rejects.toMatchObject({
      code: "MEMBERSHIP_MUST_BE_PAID",
    });
  });
});

describe("automatic discounts", () => {
  it("apply without a code while they run, and the biggest discount wins", async () => {
    const event = await paidEvent();
    await createDiscount({ kind: "AUTOMATIC", label: "Early bird", type: "PERCENT", value: 20, eventId: event.id, endsOn: ymd(5) }, "admin@example.test");
    await createDiscount({ kind: "AUTOMATIC", label: "Last year's offer", type: "AMOUNT", value: 900, endsOn: ymd(-1) }, "admin@example.test");
    await coupon({ value: 100 });

    const offer = await eventDiscountOffer(event.slug);
    expect(offer.automatic.map((d) => d.label)).toEqual(["Early bird"]);
    expect(offer.couponsAvailable).toBe(true);

    // The coupon (৳100) saves less than the early bird (20% of ৳1,000), so the early bird applies.
    const { registration } = await registerForEvent({ slug: event.slug, sessionUserId: (await makeMember()).id, rsvp: rsvp({ couponCode: "BATCH2013" }) });
    expect(registration).toMatchObject({ totalFee: 800 + 500, discountAmount: 200, discountCode: null });
  });
});

describe("admin", () => {
  it("checks the code, the amount and the dates", async () => {
    await expect(coupon({ code: "a b c" })).resolves.toMatchObject({ code: "ABC" });
    await expect(coupon({ code: "X!" })).rejects.toMatchObject({ code: "INVALID_DISCOUNT" });
    await expect(coupon({ code: "abc" })).rejects.toMatchObject({ code: "CODE_TAKEN" });
    await expect(coupon({ code: "PCT", type: "PERCENT", value: 120 })).rejects.toMatchObject({ code: "INVALID_DISCOUNT" });
    await expect(coupon({ code: "DATES", startsOn: ymd(5), endsOn: ymd(1) })).rejects.toMatchObject({ message: "The end date is before the start date." });
  });

  it("lists each discount with its uses and status, and edits keep what isn't sent", async () => {
    const event = await paidEvent();
    const created = await coupon({ maxUses: 5, endsOn: ymd(10) });
    await registerForEvent({ slug: event.slug, sessionUserId: (await makeMember()).id, rsvp: rsvp({ couponCode: "BATCH2013" }) });
    const [view] = await listDiscounts();
    expect(view).toMatchObject({ code: "BATCH2013", uses: 1, maxUses: 5, status: "ACTIVE", endsOn: ymd(10) });

    const edited = await updateDiscount(created.id, { isActive: false });
    expect(edited).toMatchObject({ isActive: false, maxUses: 5, value: 300, code: "BATCH2013" });
    expect(discountStatus(edited, 1, new Date())).toBe("OFF");
  });
});
