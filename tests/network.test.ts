import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { canReceiveMessages, memberBasics, searchMembers } from "@/lib/network";
import { GET as getMessages, POST as sendMessage } from "@/app/api/messages/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

const named = async (email: string, fullName: string, opts: { status?: "VERIFIED" | "PENDING"; batch?: number } = {}) => {
  const m = await makeMember({ email, status: opts.status ?? "VERIFIED" });
  await prisma.alumniProfile.update({
    where: { userId: m.id },
    data: { fullName, ...(opts.batch ? { sscBatch: opts.batch } : {}), verificationStatus: opts.status ?? "VERIFIED" },
  });
  return m;
};

describe("searchMembers", () => {
  it("lists verified members only, never the viewer, pending or disabled accounts", async () => {
    const me = await named("me@example.test", "Me Myself");
    await named("a@example.test", "Ayesha Siddiqua", { batch: 2010 });
    await named("p@example.test", "Pending Person", { status: "PENDING" });
    const disabled = await named("d@example.test", "Disabled Person");
    await prisma.user.update({ where: { id: disabled.id }, data: { disabledAt: new Date() } });

    const { members, total } = await searchMembers({ viewerId: me.id });
    expect(members.map((m) => m.fullName)).toEqual(["Ayesha Siddiqua"]);
    expect(total).toBe(1);
  });

  it("searches by name and filters by batch", async () => {
    const me = await named("me@example.test", "Me Myself");
    await named("a@example.test", "Ayesha Siddiqua", { batch: 2010 });
    await named("b@example.test", "Babul Hossain", { batch: 2005 });
    expect((await searchMembers({ viewerId: me.id, q: "babul" })).members.map((m) => m.fullName)).toEqual(["Babul Hossain"]);
    expect((await searchMembers({ viewerId: me.id, batch: "2010" })).members.map((m) => m.fullName)).toEqual(["Ayesha Siddiqua"]);
    expect((await searchMembers({ viewerId: me.id })).batches).toEqual(expect.arrayContaining([2010, 2005]));
  });

  it("shows phone and email only when the member made them public", async () => {
    const me = await named("me@example.test", "Me Myself");
    const priv = await named("private@example.test", "Private Person");
    const pub = await named("public@example.test", "Public Person");
    await prisma.alumniProfile.update({ where: { userId: priv.id }, data: { phone: "01711000001", isPhonePublic: false, isEmailPublic: false } });
    await prisma.alumniProfile.update({ where: { userId: pub.id }, data: { phone: "01711000002", isPhonePublic: true, isEmailPublic: true } });
    const byName = Object.fromEntries((await searchMembers({ viewerId: me.id })).members.map((m) => [m.fullName, m]));
    expect(byName["Private Person"]).toMatchObject({ phone: null, email: null });
    expect(byName["Public Person"]).toMatchObject({ phone: "01711000002", email: "public@example.test" });
  });
});

describe("messaging", () => {
  it("only active members can receive messages", async () => {
    const ok = await named("ok@example.test", "Okay Member");
    const pending = await named("p@example.test", "Pending Person", { status: "PENDING" });
    expect(await canReceiveMessages(ok.id)).toBe(true);
    expect(await canReceiveMessages(pending.id)).toBe(false);
    expect(await canReceiveMessages("no-such-user")).toBe(false);

    const me = await named("me@example.test", "Me Myself");
    session.user = { id: me.id, email: me.email, role: "ALUMNI" };
    const send = (receiverId: string) => sendMessage(new NextRequest("http://x/api/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ receiverId, content: "Hello" }) }));
    expect((await send(pending.id)).status).toBe(404);
    expect((await send(ok.id)).status).toBe(201);
  });

  it("conversations and threads carry the other member's name and photo", async () => {
    const me = await named("me@example.test", "Me Myself");
    const friend = await named("f@example.test", "Farhan Kabir", { batch: 2008 });
    await prisma.message.create({ data: { senderId: friend.id, receiverId: me.id, content: "Salam!" } });
    session.user = { id: me.id, email: me.email, role: "ALUMNI" };

    const list = await (await getMessages(new NextRequest("http://x/api/messages"))).json();
    expect(list.conversations[0]).toMatchObject({ partnerId: friend.id, unreadCount: 1, partner: { fullName: "Farhan Kabir", sscBatch: 2008 } });

    const thread = await (await getMessages(new NextRequest(`http://x/api/messages?with=${friend.id}`))).json();
    expect(thread.partner.fullName).toBe("Farhan Kabir");
    expect(thread.messages.map((m: { content: string }) => m.content)).toEqual(["Salam!"]);

    expect((await memberBasics([friend.id])).get(friend.id)?.avatarUrl).toMatch(/^data:image\/svg\+xml/);
  });
});
