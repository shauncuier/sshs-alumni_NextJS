import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { registerForEvent } from "@/lib/events/registrations";
import { checkInCounts, checkInTicket } from "@/lib/events/tickets";
import { GET, POST } from "@/app/api/events/verify-ticket/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

async function ticketFor(slug: string) {
  const member = await makeMember();
  const { registration } = await registerForEvent({ slug, sessionUserId: member.id, rsvp: {} });
  return registration.ticket!.qrText;
}

describe("gate check-in for one event", () => {
  it("refuses a ticket for another event and counts who is in", async () => {
    const picnic = await makeEvent({ slug: "picnic", title: "Picnic", date: new Date(Date.now() + 86_400_000) });
    await makeEvent({ slug: "dinner", title: "Dinner", date: new Date(Date.now() + 2 * 86_400_000) });
    const picnicTicket = await ticketFor("picnic");
    const dinnerTicket = await ticketFor("dinner");
    await ticketFor("picnic");

    expect(await checkInTicket(dinnerTicket, "g@x.test", new Date(), picnic.id)).toMatchObject({ ok: false, reason: "WRONG_EVENT", message: expect.stringContaining("Dinner") });
    expect(await checkInTicket(picnicTicket, "g@x.test", new Date(), picnic.id)).toMatchObject({ ok: true });
    expect(await checkInCounts(picnic.id)).toEqual({ checkedIn: 1, expected: 2, people: 1 });
    // The refused dinner ticket is still valid for its own event.
    expect((await prisma.eventRegistration.count({ where: { status: "CHECKED_IN" } }))).toBe(1);
  });

  it("only gate staff list events, see counts and check tickets in", async () => {
    const picnic = await makeEvent({ slug: "picnic", title: "Picnic", date: new Date(Date.now() + 86_400_000) });
    const ticket = await ticketFor("picnic");
    const post = (body: unknown) => POST(new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

    const member = await makeMember();
    session.user = { id: member.id, email: member.email, role: "ALUMNI" };
    expect((await GET(new Request("http://x/api/events/verify-ticket"))).status).toBe(403);
    expect((await post({ code: ticket, eventId: picnic.id })).status).toBe(403);

    const mod = await makeMember({ role: "MODERATOR" });
    session.user = { id: mod.id, email: mod.email, role: "MODERATOR" };
    const list = await (await GET(new Request("http://x/api/events/verify-ticket"))).json();
    expect(list.events.map((e: { title: string }) => e.title)).toEqual(["Picnic"]);
    expect((await post({ code: ticket, eventId: picnic.id })).status).toBe(200);
    expect(await (await GET(new Request(`http://x/api/events/verify-ticket?eventId=${picnic.id}`))).json()).toEqual({ checkedIn: 1, expected: 1, people: 1 });
    expect((await post({ code: ticket, eventId: picnic.id })).status).toBe(409);
  });
});
