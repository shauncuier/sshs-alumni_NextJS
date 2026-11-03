import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import prisma from "@/lib/prisma";
import { createSchoolPerson, deleteSchoolPerson, getHomeTribute, getSchoolPeople, listSchoolPeople, seedSchoolPeople, updateSchoolPerson } from "@/lib/teachers";
import { FIRST_SCHOOL_PEOPLE } from "@/lib/teachers-seed";
import { GET as listRoute, POST as createRoute } from "@/app/api/admin/teachers/route";
import { PATCH as updateRoute } from "@/app/api/admin/teachers/[id]/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

const json = (method: string, body: unknown) => new Request("http://x/api", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const signIn = async (role: "ADMIN" | "MODERATOR" | "TREASURER") => {
  const user = await makeMember({ role, email: `${role.toLowerCase()}@example.test` });
  session.user = { id: user.id, email: user.email, role };
};
const names = (list: { nameBn: string }[]) => list.map((p) => p.nameBn);

describe("teachers", () => {
  it("splits the shown people into the /school sections and hides unknown or hidden ones", async () => {
    await createSchoolPerson({ kind: "TEACHER", status: "FORMER", nameBn: "পুরনো শিক্ষক" });
    await createSchoolPerson({ kind: "FOUNDER", status: "UNKNOWN", nameBn: "প্রতিষ্ঠাতা" });
    await createSchoolPerson({ kind: "TEACHER", status: "CURRENT", nameBn: "এখনকার শিক্ষক" });
    await createSchoolPerson({ kind: "TEACHER", status: "LATE", nameBn: "মরহুম শিক্ষক" });
    await createSchoolPerson({ kind: "TEACHER", status: "UNKNOWN", nameBn: "অজানা শিক্ষক" });
    await createSchoolPerson({ kind: "HEAD_TEACHER", status: "CURRENT", nameBn: "প্রধান শিক্ষক" });
    await createSchoolPerson({ kind: "STAFF", status: "CURRENT", nameBn: "অফিস সহায়ক", isPublished: false });

    const s = await getSchoolPeople();
    // Founders show even with an unknown status, and come before head teachers.
    expect(names(s.leaders)).toEqual(["প্রতিষ্ঠাতা", "প্রধান শিক্ষক"]);
    expect(names(s.current)).toEqual(["এখনকার শিক্ষক"]);
    expect(names(s.former)).toEqual(["পুরনো শিক্ষক", "মরহুম শিক্ষক"]);
    expect(s.staff).toEqual([]);
    // The admin list still has everyone.
    expect(await listSchoolPeople()).toHaveLength(7);
  });

  it("puts only the chosen, shown people in the home page panel", async () => {
    await createSchoolPerson({ kind: "FOUNDER", status: "UNKNOWN", nameBn: "প্রতিষ্ঠাতা", onHomePage: true });
    await createSchoolPerson({ kind: "TEACHER", status: "UNKNOWN", nameBn: "অজানা", onHomePage: true });
    await createSchoolPerson({ kind: "TEACHER", status: "FORMER", nameBn: "সাধারণ" });
    expect(names(await getHomeTribute())).toEqual(["প্রতিষ্ঠাতা"]);
  });

  it("validates the fields and refuses photos linked from elsewhere", async () => {
    await expect(createSchoolPerson({ kind: "PRINCIPAL", status: "CURRENT", nameBn: "নাম" })).rejects.toMatchObject({ status: 400 });
    await expect(createSchoolPerson({ kind: "TEACHER", status: "RETIRED", nameBn: "নাম" })).rejects.toMatchObject({ status: 400 });
    await expect(createSchoolPerson({ kind: "TEACHER", status: "CURRENT", nameBn: "" })).rejects.toMatchObject({ status: 400 });
    await expect(createSchoolPerson({ kind: "TEACHER", status: "CURRENT", nameBn: "নাম", photoUrl: "https://example.com/x.jpg" })).rejects.toMatchObject({ status: 400 });
    const ok = await createSchoolPerson({ kind: "TEACHER", status: "CURRENT", nameBn: "নাম", photoUrl: "/teachers/anwar-ali.jpg" });
    expect(ok.photoUrl).toBe("/teachers/anwar-ali.jpg");
  });

  it("updates the status and removes people", async () => {
    const p = await createSchoolPerson({ kind: "TEACHER", status: "UNKNOWN", nameBn: "নাম" });
    expect((await updateSchoolPerson(p.id, { status: "LATE" })).status).toBe("LATE");
    await deleteSchoolPerson(p.id);
    await expect(updateSchoolPerson(p.id, { status: "FORMER" })).rejects.toMatchObject({ status: 404 });
  });

  it("imports the first list once, and a removed person stays removed", async () => {
    expect(await seedSchoolPeople()).toBe(FIRST_SCHOOL_PEOPLE.length);
    const all = await listSchoolPeople();
    expect(all).toHaveLength(FIRST_SCHOOL_PEOPLE.length);
    expect(all.filter((p) => p.kind === "HEAD_TEACHER" && p.status === "CURRENT").map((p) => p.nameEn)).toEqual(["Nurjahan Akter"]);
    await deleteSchoolPerson(all[0].id);
    expect(await seedSchoolPeople()).toBe(0);
    expect(await prisma.schoolPerson.count()).toBe(FIRST_SCHOOL_PEOPLE.length - 1);
  });

  it("lets admins and moderators manage the list, and no one else", async () => {
    await signIn("TREASURER");
    expect((await listRoute()).status).toBe(403);
    expect((await createRoute(json("POST", { kind: "TEACHER", status: "CURRENT", nameBn: "নাম" }))).status).toBe(403);

    await signIn("MODERATOR");
    const created = await createRoute(json("POST", { kind: "TEACHER", status: "CURRENT", nameBn: "নতুন শিক্ষক" }));
    expect(created.status).toBe(201);
    const { person } = await created.json();
    const res = await updateRoute(json("PATCH", { status: "FORMER" }), { params: Promise.resolve({ id: person.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).person.status).toBe("FORMER");
    expect(await prisma.activityLog.count({ where: { action: { startsWith: "teacher." } } })).toBe(2);
  });
});
