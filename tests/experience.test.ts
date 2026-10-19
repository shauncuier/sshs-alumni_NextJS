import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string; status?: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user, getMemberSession: async () => (session.user ? { user: session.user } : null) };
});

import { experiencePeriod, normalizeExperience, readExperience } from "@/lib/members/experience";
import { PUT } from "@/app/api/profile/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

const job = { title: "Engineer", company: "Grameenphone", type: "Full-time", location: "Dhaka", description: "" };

describe("work experience", () => {
  it("keeps real positions, current first then newest, drops empty rows and refuses bad ones", () => {
    const now = new Date("2026-10-19");
    expect(
      normalizeExperience(
        [
          { ...job, title: "Trainee", start: "2015-03", end: "2016-02", current: false },
          { title: "", company: "", start: "" },
          { ...job, title: " Senior  Engineer ", start: "2020-01", end: "2023-12", current: false, type: "Wizard" },
          { ...job, title: "Head of IT", company: "bKash", start: "2024-01", end: "2025-05", current: true },
        ],
        now
      )
    ).toEqual([
      { ...job, title: "Head of IT", company: "bKash", start: "2024-01", end: "", current: true },
      { ...job, title: "Senior Engineer", type: "", start: "2020-01", end: "2023-12", current: false },
      { ...job, title: "Trainee", start: "2015-03", end: "2016-02", current: false },
    ]);
    expect(experiencePeriod({ start: "2020-01", end: "", current: true }, now)).toBe("Jan 2020 – Present · 6 yrs 10 mos");
    expect(experiencePeriod({ start: "2015-03", end: "2016-02", current: false }, now)).toBe("Mar 2015 – Feb 2016 · 1 yr");
    expect(experiencePeriod({ start: "2026-10", end: "", current: true }, now)).toBe("Oct 2026 – Present · 1 mo");
    expect(() => normalizeExperience([{ ...job, title: "", start: "2020-01", current: true }], now)).toThrow(/job title/);
    expect(() => normalizeExperience([{ ...job, company: "", start: "2020-01", current: true }], now)).toThrow(/company/);
    expect(() => normalizeExperience([{ ...job, start: "2027-01", current: true }], now)).toThrow(/start month/);
    expect(() => normalizeExperience([{ ...job, start: "2020-01", end: "", current: false }], now)).toThrow(/currently work here/);
    expect(() => normalizeExperience([{ ...job, start: "2020-05", end: "2020-01" }], now)).toThrow(/before its start/);
    expect(() => normalizeExperience([{ ...job, start: "2020-05", end: "2027-01" }], now)).toThrow(/future/);
    expect(() => normalizeExperience(Array.from({ length: 16 }, () => ({ ...job, start: "2020-01", current: true })), now)).toThrow(/at most 15/);
    expect(readExperience("broken")).toEqual([]);
  });

  it("a member saves it from the profile page, and the current job becomes the profession and company", async () => {
    const m = await makeMember();
    session.user = { id: m.id, email: m.email, role: "ALUMNI", status: "VERIFIED" };
    const put = (body: unknown) =>
      PUT(new Request("http://x/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
    const res = await put({
      experience: [
        { ...job, start: "2018-01", end: "2021-06", current: false },
        { ...job, title: "Head of IT", company: "bKash", start: "2021-07", current: true },
      ],
    });
    expect(res.status).toBe(200);
    const p = await prisma.alumniProfile.findUniqueOrThrow({ where: { userId: m.id } });
    expect(p.experience).toEqual([
      { ...job, title: "Head of IT", company: "bKash", start: "2021-07", end: "", current: true },
      { ...job, start: "2018-01", end: "2021-06", current: false },
    ]);
    expect(p.profession).toBe("Head of IT");
    expect(p.company).toBe("bKash");

    // Past jobs only: the profession the member typed stays.
    expect((await put({ experience: [{ ...job, start: "2018-01", end: "2021-06" }] })).status).toBe(200);
    const after = await prisma.alumniProfile.findUniqueOrThrow({ where: { userId: m.id } });
    expect(after.profession).toBe("Head of IT");

    const bad = await put({ experience: [{ ...job, start: "2020-01" }] });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/end month/);
  });
});
