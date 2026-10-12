import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { createVolunteer, getVolunteers, updateVolunteerStatus } from "@/lib/volunteers";
import { GET, PATCH, POST } from "@/app/api/volunteers/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

const application = {
  fullName: "Sadia Islam",
  email: "Sadia@Example.test",
  phone: "01711000444",
  sscBatch: 2010,
  subcommittee: "MEDICAL_FIRSTAID",
  skills: "First aid",
};
const json = (body: unknown, method = "POST") =>
  new Request("http://x/api/volunteers", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("volunteers in the database", () => {
  it("starts empty — no made-up volunteers", async () => {
    expect(await getVolunteers()).toEqual([]);
  });

  it("stores an application and lists it", async () => {
    const created = await createVolunteer(application);
    expect(created).toMatchObject({ email: "sadia@example.test", status: "PENDING", subcommitteeLabel: "Alumni Medical Wing & First Aid" });
    expect((await getVolunteers("PENDING")).map((v) => v.id)).toEqual([created.id]);
    expect(await getVolunteers("APPROVED")).toEqual([]);
  });

  it("refuses a second open application to the same subcommittee, but allows one after a decline", async () => {
    const first = await createVolunteer(application);
    await expect(createVolunteer({ ...application, email: "sadia@example.test" })).rejects.toMatchObject({ status: 409, code: "ALREADY_APPLIED" });
    await expect(createVolunteer({ ...application, subcommittee: "GATE_SECURITY" })).resolves.toBeTruthy();
    await updateVolunteerStatus(first.id, "DECLINED", undefined, "admin@example.test");
    await expect(createVolunteer(application)).resolves.toBeTruthy();
  });

  it("refuses unknown subcommittees and records who decided", async () => {
    await expect(createVolunteer({ ...application, subcommittee: "NOPE" })).rejects.toMatchObject({ status: 400 });
    const created = await createVolunteer(application);
    await expect(updateVolunteerStatus(created.id, "APPROVED", "NOPE")).rejects.toMatchObject({ status: 400 });
    await updateVolunteerStatus(created.id, "APPROVED", "GATE_SECURITY", "boss@example.test");
    const row = await prisma.volunteer.findUniqueOrThrow({ where: { id: created.id } });
    expect(row).toMatchObject({ status: "APPROVED", subcommittee: "GATE_SECURITY", decidedBy: "boss@example.test" });
    expect(row.decidedAt).toBeInstanceOf(Date);
    expect(await updateVolunteerStatus("missing", "APPROVED")).toBeNull();
  });
});

describe("/api/volunteers", () => {
  it("accepts a public application and links it to a signed-in member", async () => {
    const member = await makeMember({ email: "m@example.test" });
    session.user = { id: member.id, email: member.email, role: "ALUMNI" };
    const res = await POST(json(application));
    expect(res.status).toBe(201);
    const row = await prisma.volunteer.findFirstOrThrow();
    expect(row.userId).toBe(member.id);
  });

  it("a signed-in member volunteering while registering gets their own details, never invented ones", async () => {
    const member = await makeMember({ email: "reg@example.test" });
    await prisma.alumniProfile.update({ where: { userId: member.id }, data: { fullName: "Rahim Uddin", phone: "01711000111", sscBatch: 2004 } });
    session.user = { id: member.id, email: member.email, role: "ALUMNI" };
    const res = await POST(json({ subcommittee: "MEDICAL_FIRSTAID", source: "EVENT_REGISTRATION" }));
    expect(res.status).toBe(201);
    expect(await prisma.volunteer.findFirstOrThrow()).toMatchObject({ fullName: "Rahim Uddin", email: "reg@example.test", phone: "01711000111", sscBatch: 2004, userId: member.id });
    // Signed out, the details are required.
    session.user = null;
    expect((await POST(json({ subcommittee: "GATE_SECURITY" }))).status).toBe(400);
  });

  it("answers wrongly typed input with 400, not a crash", async () => {
    for (const bad of [{ ...application, fullName: 42 }, { ...application, email: ["x"] }, { ...application, sscBatch: "abc" }, { ...application, subcommittee: 7 }]) {
      expect((await POST(json(bad))).status).toBe(400);
    }
  });

  it("lets only admins list and decide", async () => {
    const created = await createVolunteer(application);
    expect((await GET(new Request("http://x/api/volunteers"))).status).toBe(403);
    expect((await PATCH(json({ id: created.id, status: "APPROVED" }, "PATCH"))).status).toBe(403);

    const admin = await makeMember({ role: "ADMIN", email: "boss@example.test" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    expect((await PATCH(json({ id: created.id, status: "MAYBE" }, "PATCH"))).status).toBe(400);
    expect((await PATCH(json({ id: "missing", status: "APPROVED" }, "PATCH"))).status).toBe(404);
    expect((await PATCH(json({ id: created.id, status: "APPROVED" }, "PATCH"))).status).toBe(200);
    const list = await (await GET(new Request("http://x/api/volunteers?status=APPROVED"))).json();
    expect(list.volunteers.map((v: { id: string }) => v.id)).toEqual([created.id]);
    expect(await prisma.activityLog.count({ where: { action: "volunteer.approved", actorEmail: "boss@example.test" } })).toBe(1);
  });
});
