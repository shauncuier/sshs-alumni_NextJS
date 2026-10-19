import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string; status?: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user, getMemberSession: async () => (session.user ? { user: session.user } : null) };
});

import { educationYears, normalizeEducation, readEducation } from "@/lib/members/education";
import { PUT } from "@/app/api/profile/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

describe("education after SSC", () => {
  it("keeps real entries newest first, reads old single years, drops empty rows and refuses bad ones", () => {
    const now = new Date("2026-10-19");
    const blank = { grade: "", description: "" };
    expect(
      normalizeEducation(
        [
          { level: "HSC", institution: "Chittagong College", subject: "Science", year: 2015 },
          { level: "", institution: "", subject: "", year: "" },
          { level: "PHD", institution: " University of Dhaka ", subject: "Public Health", startYear: "2021" },
          { level: "MASTERS", institution: "University of Chittagong", subject: "Economics", startYear: 2018, endYear: 2020, grade: "CGPA 3.75", description: "Thesis on rural credit" },
        ],
        now
      )
    ).toEqual([
      { level: "PHD", institution: "University of Dhaka", subject: "Public Health", startYear: 2021, endYear: null, ...blank },
      { level: "MASTERS", institution: "University of Chittagong", subject: "Economics", startYear: 2018, endYear: 2020, grade: "CGPA 3.75", description: "Thesis on rural credit" },
      { level: "HSC", institution: "Chittagong College", subject: "Science", startYear: null, endYear: 2015, ...blank },
    ]);
    expect(educationYears({ startYear: 2021, endYear: null }, now)).toBe("2021 – present");
    expect(educationYears({ startYear: 2015, endYear: 2019 }, now)).toBe("2015 – 2019");
    expect(() => normalizeEducation([{ level: "MASTERS", institution: "" }], now)).toThrow(/school or university/);
    expect(() => normalizeEducation([{ level: "WIZARD", institution: "X" }], now)).toThrow(/degree/);
    expect(() => normalizeEducation([{ level: "HSC", institution: "X", endYear: 1900 }], now)).toThrow(/end year/);
    expect(() => normalizeEducation([{ level: "HSC", institution: "X", startYear: 2020, endYear: 2018 }], now)).toThrow(/after its end year/);
    expect(() => normalizeEducation(Array.from({ length: 11 }, () => ({ level: "HSC", institution: "X" })), now)).toThrow(/at most 10/);
    expect(readEducation("broken")).toEqual([]);
  });

  it("a member saves it from the profile page", async () => {
    const m = await makeMember();
    session.user = { id: m.id, email: m.email, role: "ALUMNI", status: "VERIFIED" };
    const put = (body: unknown) =>
      PUT(new Request("http://x/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
    expect((await put({ education: [{ level: "MASTERS", institution: "University of Chittagong", subject: "Economics", startYear: 2018, endYear: 2020 }] })).status).toBe(200);
    const p = await prisma.alumniProfile.findUniqueOrThrow({ where: { userId: m.id } });
    expect(p.education).toEqual([{ level: "MASTERS", institution: "University of Chittagong", subject: "Economics", startYear: 2018, endYear: 2020, grade: "", description: "" }]);
    const bad = await put({ education: [{ level: "PHD", institution: "" }] });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/school or university/);
  });
});
