import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { GET, POST } from "@/app/api/admin/id-cards/route";
import { buildCardsFor, listCardCandidates } from "@/lib/member-card";
import { verifyCardToken } from "@/lib/id-card";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

const post = (body: unknown) =>
  POST(new Request("http://x/api/admin/id-cards", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

describe("membership ID cards", () => {
  it("lists only approved, active members, by batch then name", async () => {
    const a = await makeMember();
    const b = await makeMember();
    await prisma.alumniProfile.update({ where: { userId: a.id }, data: { sscBatch: 2005, fullName: "Zara" } });
    await prisma.alumniProfile.update({ where: { userId: b.id }, data: { sscBatch: 1999, fullName: "Amin" } });
    await makeMember({ status: "PENDING" });
    const disabled = await makeMember();
    await prisma.user.update({ where: { id: disabled.id }, data: { disabledAt: new Date() } });

    const list = await listCardCandidates();
    expect(list.map((m) => m.fullName)).toEqual(["Amin", "Zara"]);
    expect((await listCardCandidates({ batch: 2005 })).map((m) => m.fullName)).toEqual(["Zara"]);
    expect((await listCardCandidates({ q: "ami" })).map((m) => m.fullName)).toEqual(["Amin"]);
  });

  it("builds cards whose QR opens a valid gate pass, and skips members not approved", async () => {
    const ok = await makeMember();
    const pending = await makeMember({ status: "PENDING" });
    const cards = await buildCardsFor([ok.id, pending.id, ok.id], "https://alumni.test");
    expect(cards).toHaveLength(1);
    expect(cards[0].qrDataUrl.startsWith("data:image/png")).toBe(true);
    const token = cards[0].verifyUrl.replace("https://alumni.test/verify/", "");
    expect(verifyCardToken(token)).toMatchObject({ valid: true, payload: { userId: ok.id, alumniId: cards[0].alumniId } });
  });

  it("is for admins only, and every bulk print is logged", async () => {
    const mod = await makeMember({ role: "MODERATOR" });
    session.user = { id: mod.id, email: mod.email, role: "MODERATOR" };
    expect((await GET(new Request("http://x/api/admin/id-cards"))).status).toBe(403);
    expect((await post({ userIds: [mod.id] })).status).toBe(403);

    const admin = await makeMember({ role: "ADMIN" });
    const member = await makeMember();
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    const res = await post({ userIds: [member.id] });
    expect(res.status).toBe(200);
    expect((await res.json()).cards).toHaveLength(1);
    const log = await prisma.activityLog.findFirstOrThrow({ where: { action: "id_cards.printed" } });
    expect(log.summary).toBe("Printed 1 membership card");

    expect((await post({ userIds: [] })).status).toBe(400);
    expect((await post({ userIds: Array.from({ length: 201 }, (_, i) => `id-${i}`) })).status).toBe(400);
  });
});
