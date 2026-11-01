import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "../helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});
vi.mock("@/lib/volunteers", () => ({ getVolunteers: async () => [] }));

import { GET as contactsRoute, type SmsContactItem } from "@/app/api/admin/sms/contacts/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

describe("SMS contacts", () => {
  it("lists every registered member's number, marked verified or not", async () => {
    const admin = await makeMember({ role: "ADMIN" });
    session.user = { ...admin, role: "ADMIN" };
    const verified = await makeMember({ status: "PENDING" });
    const typed = await makeMember({ status: "PENDING" });
    await prisma.alumniProfile.update({ where: { userId: verified.id }, data: { phone: "01711000111", phoneVerifiedAt: new Date() } });
    await prisma.alumniProfile.update({ where: { userId: typed.id }, data: { phone: "01811000222" } });

    const res = await contactsRoute();
    expect(res.status).toBe(200);
    const { contacts } = (await res.json()) as { contacts: SmsContactItem[] };
    const byId = Object.fromEntries(contacts.map((c) => [c.id, c]));
    expect(byId[`usr-${verified.id}`]).toMatchObject({ normalizedPhone: "8801711000111", phoneVerified: true, status: "PENDING" });
    expect(byId[`usr-${typed.id}`]).toMatchObject({ normalizedPhone: "8801811000222", phoneVerified: false });
  });

  it("is for admins only", async () => {
    const member = await makeMember();
    session.user = { ...member, role: "ALUMNI" };
    expect((await contactsRoute()).status).toBe(403);
  });
});
