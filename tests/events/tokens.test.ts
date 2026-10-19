import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { registerForEvent } from "@/lib/events/registrations";
import { checkInTicket } from "@/lib/events/tickets";
import { createTokenCode, ensureTokens, readTokenCode, redeemToken, tokenCounts, tokensForPrint } from "@/lib/events/tokens";
import { decideRegistration } from "@/lib/events/admin";
import { GET, POST } from "@/app/api/events/redeem-token/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

/** A free event confirms at once: a member + spouse + child = 3 people. */
async function confirmed(slug = "jubilee") {
  const event = await makeEvent({
    slug,
    guestTypes: [
      { name: "Spouse", price: 0, max: 1 },
      { name: "Child", price: 0, max: 5 },
    ],
  });
  const member = await makeMember();
  const { registration } = await registerForEvent({ slug, sessionUserId: member.id, rsvp: { guests: { Spouse: 1, Child: 1 } } });
  return { event, member, registration };
}

const tokenOf = async (registrationId: string, kind: string, person = 1) =>
  createTokenCode((await prisma.eventToken.findFirstOrThrow({ where: { registrationId, kind, person } })).id);

describe("food and kit tokens", () => {
  it("one per meal per person plus one kit, created once", async () => {
    const { event, registration } = await confirmed();
    expect(registration.headCount).toBe(3);
    const printed = await tokensForPrint(event.id);
    expect(printed).toHaveLength(3 * 3 + 1);
    expect(printed.filter((t) => t.kind === "KIT")).toHaveLength(1);
    expect(printed[0]).toMatchObject({ people: 3, slipNo: expect.stringMatching(/^SSG-[0-9A-F]{8}$/) });
    await ensureTokens(registration.id);
    await tokensForPrint(event.id);
    expect(await prisma.eventToken.count()).toBe(10); // reprints reuse the same tokens
  });

  it("serves a token once, at its own counter and event only", async () => {
    const { event, registration } = await confirmed();
    await ensureTokens(registration.id);
    const lunch = await tokenOf(registration.id, "LUNCH", 2);

    await expect(redeemToken(lunch, "v@x.test", { eventId: event.id, kind: "BREAKFAST" })).resolves.toMatchObject({ ok: false, reason: "WRONG_COUNTER" });
    const other = await makeEvent({ slug: "picnic" });
    await expect(redeemToken(lunch, "v@x.test", { eventId: other.id, kind: "LUNCH" })).resolves.toMatchObject({ ok: false, reason: "WRONG_EVENT" });

    await expect(redeemToken(lunch, "v@x.test", { eventId: event.id, kind: "LUNCH" })).resolves.toMatchObject({ ok: true, person: 2, people: 3 });
    const again = await redeemToken(lunch, "w@x.test", { eventId: event.id, kind: "LUNCH" });
    expect(again).toMatchObject({ ok: false, reason: "ALREADY_USED" });
    expect(again.ok ? "" : again.message).toContain("v@x.test");

    expect((await tokenCounts(event.id)).LUNCH).toEqual({ used: 1, total: 3 });
  });

  it("refuses tokens of a cancelled registration, and never mixes tokens with tickets", async () => {
    const { event, registration } = await confirmed();
    await ensureTokens(registration.id);
    const dinner = await tokenOf(registration.id, "DINNER");
    // A token is not a ticket, and a ticket is not a token.
    await expect(checkInTicket(dinner, "v@x.test")).resolves.toMatchObject({ ok: false, reason: "INVALID" });
    expect(readTokenCode(registration.ticket!.qrText)).toBeNull();

    await prisma.eventRegistration.update({ where: { id: registration.id }, data: { status: "CANCELLED" } });
    await expect(redeemToken(dinner, "v@x.test", { eventId: event.id, kind: "DINNER" })).resolves.toMatchObject({ ok: false, reason: "CANCELLED" });
  });

  it("makes no tokens for a registration still waiting for payment", async () => {
    await makeEvent({ slug: "paid", registrationFee: 500, paymentInstructions: "bKash" });
    const member = await makeMember();
    const { registration } = await registerForEvent({ slug: "paid", sessionUserId: member.id, rsvp: { paymentMethod: "bKash", transactionId: "TRXTOKEN01" } });
    await ensureTokens(registration.id);
    expect(await prisma.eventToken.count()).toBe(0);
    await decideRegistration({ eventId: registration.eventId, registrationId: registration.id, action: "APPROVE", adminEmail: "a@x.test" });
    await ensureTokens(registration.id);
    expect(await prisma.eventToken.count()).toBe(4); // 1 person: 3 meals + kit
  });

  it("the counter route is for gate staff, answers 409 on a second scan", async () => {
    const { event, registration } = await confirmed();
    await ensureTokens(registration.id);
    const code = await tokenOf(registration.id, "KIT");
    const post = (body: unknown) =>
      POST(new Request("http://x/api/events/redeem-token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

    const alum = await makeMember();
    session.user = { id: alum.id, email: alum.email, role: "ALUMNI" };
    expect((await post({ code, eventId: event.id, kind: "KIT" })).status).toBe(403);

    const mod = await makeMember({ role: "MODERATOR" });
    session.user = { id: mod.id, email: mod.email, role: "MODERATOR" };
    expect((await post({ code, eventId: event.id, kind: "SNACK" })).status).toBe(400);
    expect((await post({ code, eventId: event.id, kind: "KIT" })).status).toBe(200);
    expect((await post({ code, eventId: event.id, kind: "KIT" })).status).toBe(409);
    const counts = await (await GET(new Request(`http://x/api/events/redeem-token?eventId=${event.id}`))).json();
    expect(counts.KIT).toEqual({ used: 1, total: 1 });
  });
});
