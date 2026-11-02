import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import prisma from "@/lib/prisma";
import { decideRegistration } from "@/lib/events/admin";
import { editRegistration } from "@/lib/events/edit-registration";
import { ensureTokens } from "@/lib/events/tokens";
import { GET, PUT } from "@/app/api/admin/events/[id]/registrations/[regId]/route";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

beforeEach(async () => {
  await resetDatabase();
  session.user = null;
});

const GUEST_TYPES = [
  { name: "Spouse", price: 600, max: 2 },
  { name: "Child", price: 600, max: 4 },
];

async function setup(opts: { status?: "PENDING_PAYMENT" | "CONFIRMED"; membership?: boolean } = {}) {
  const event = await makeEvent({ slug: "jubilee", registrationFee: 1500, guestTypes: GUEST_TYPES, isMembershipEvent: opts.membership ?? false, paymentInstructions: "Bangla QR" });
  const member = await makeMember();
  const reg = await prisma.eventRegistration.create({
    data: { eventId: event.id, userId: member.id, totalFee: 1500, headCount: 1, guestCount: 1, paymentMethod: "Cash", status: "PENDING_PAYMENT" },
  });
  if (opts.status === "CONFIRMED") await decideRegistration({ eventId: event.id, registrationId: reg.id, action: "APPROVE", adminEmail: "admin@example.test" });
  return { event, reg };
}

const edit = (event: { id: string }, reg: { id: string }, rest: Partial<Parameters<typeof editRegistration>[0]> = {}) =>
  editRegistration({ eventId: event.id, registrationId: reg.id, adminEmail: "super@example.test", ...rest });

describe("editRegistration", () => {
  it("re-prices a pending registration from the event's prices, keeping guest names given", async () => {
    const { event, reg } = await setup();
    const { registration, before, after } = await edit(event, reg, {
      guests: { Spouse: 1, Child: 2 },
      guestPeople: { Spouse: [{ name: "Rina" }], Child: [{ name: "Tuba", age: 7 }, { name: "" }] },
    });
    expect([registration.headCount, registration.totalFee]).toEqual([4, 3300]);
    expect(registration.guests).toEqual([
      { name: "Spouse", count: 1, price: 600, people: [{ name: "Rina" }] },
      { name: "Child", count: 2, price: 600, people: [{ name: "Tuba", age: 7 }] },
    ]);
    expect([before.headCount, before.totalFee, after.headCount, after.totalFee]).toEqual([1, 1500, 4, 3300]);
    expect(await prisma.financeEntry.count()).toBe(0);
  });

  it("uses the amount actually paid when given", async () => {
    const { event, reg } = await setup();
    const { registration } = await edit(event, reg, { guests: { Child: 3 }, amountOverride: "3000" });
    expect([registration.headCount, registration.totalFee]).toEqual([4, 3000]);
    await expect(edit(event, reg, { amountOverride: "12.5" })).rejects.toMatchObject({ status: 400 });
  });

  it("corrects the accounts and the food tokens of a confirmed registration", async () => {
    const { event, reg } = await setup({ status: "CONFIRMED" });
    await ensureTokens(reg.id);
    expect(await prisma.eventToken.count({ where: { registrationId: reg.id, kind: "LUNCH" } })).toBe(1);

    await edit(event, reg, { guests: { Spouse: 1, Child: 2 } });
    const fees = await prisma.financeEntry.findMany({ where: { sourceId: reg.id }, orderBy: { sourceLine: "asc" } });
    expect(fees.map((f) => [f.sourceLine, f.amount, f.status])).toEqual([
      ["fee", 150000, "VOID"],
      ["fee-2", 330000, "APPROVED"],
    ]);
    expect(fees[0].voidReason).toBe("Registration corrected: ৳1,500 → ৳3,300");
    expect(await prisma.eventToken.count({ where: { registrationId: reg.id, kind: "LUNCH" } })).toBe(4);

    // Fewer people: unused tokens of the extra people go; a used one stays.
    await prisma.eventToken.updateMany({ where: { registrationId: reg.id, kind: "LUNCH", person: 4 }, data: { usedAt: new Date() } });
    await edit(event, reg, { guests: { Spouse: 1 } });
    const lunch = await prisma.eventToken.findMany({ where: { registrationId: reg.id, kind: "LUNCH" }, orderBy: { person: "asc" } });
    expect(lunch.map((t) => t.person)).toEqual([1, 2, 4]);
    const active = await prisma.financeEntry.findMany({ where: { sourceId: reg.id, status: "APPROVED" } });
    expect(active.map((f) => [f.sourceLine, f.amount])).toEqual([["fee-3", 210000]]);
  });

  it("leaves the accounts alone when the fee does not change", async () => {
    const { event, reg } = await setup({ status: "CONFIRMED" });
    await edit(event, reg, { guests: { Spouse: 1 }, amountOverride: 1500 });
    expect((await prisma.financeEntry.findMany({ where: { sourceId: reg.id } })).map((f) => [f.sourceLine, f.status])).toEqual([["fee", "APPROVED"]]);
  });

  it("refuses cancelled registrations, unknown guest types and an unpaid membership", async () => {
    const { event, reg } = await setup({ membership: true });
    await expect(edit(event, reg, { guests: { Cousin: 1 } })).rejects.toMatchObject({ status: 400 });
    await expect(edit(event, reg, { amountOverride: 0 })).rejects.toMatchObject({ status: 400 });
    await prisma.eventRegistration.update({ where: { id: reg.id }, data: { status: "CANCELLED" } });
    await expect(edit(event, reg, {})).rejects.toMatchObject({ status: 409 });
  });
});

describe("GET/PUT /api/admin/events/[id]/registrations/[regId]", () => {
  const call = (method: "GET" | "PUT", event: { id: string }, reg: { id: string }, body?: unknown) => {
    const req = new Request(`http://localhost/api/admin/events/${event.id}/registrations/${reg.id}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const params = Promise.resolve({ id: event.id, regId: reg.id });
    return method === "GET" ? GET(req, { params }) : PUT(req, { params });
  };

  it("is for the super admin only", async () => {
    const { event, reg } = await setup();
    session.user = { id: "a", email: "admin@example.test", role: "ADMIN" };
    expect((await call("GET", event, reg)).status).toBe(403);
    expect((await call("PUT", event, reg, { guests: { Child: 1 } })).status).toBe(403);

    session.user = { id: "s", email: "super@example.test", role: "SUPER_ADMIN" };
    const got = await call("GET", event, reg);
    expect(got.status).toBe(200);
    expect((await got.json()).event.guestTypes.map((g: { name: string }) => g.name)).toEqual(["Spouse", "Child"]);
    const put = await call("PUT", event, reg, { guests: { Child: 1 }, note: "Paid for two" });
    expect(put.status).toBe(200);
    expect((await put.json()).registration).toMatchObject({ headCount: 2, totalFee: 2100 });
    const log = await prisma.activityLog.findFirstOrThrow({ where: { action: "registration.edited" } });
    expect(log.metadata).toMatchObject({ note: "Paid for two", before: { headCount: 1 }, after: { headCount: 2 } });
  });
});
