import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { DEFAULT_CONTACT_PHONES, formatContactNumber, normalizeContactPhones, telHref } from "@/lib/contact-phones-shared";
import { getContactPhones, setContactPhones } from "@/lib/contact-phones";
import { GET as adminGet, PUT as adminPut } from "@/app/api/admin/settings/contact-phones/route";
import { GET as publicGet } from "@/app/api/contact-phones/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

const put = (body: unknown) =>
  adminPut(new Request("http://localhost:3000/api/admin/settings/contact-phones", { method: "PUT", headers: { "content-type": "application/json", origin: "http://localhost:3000" }, body: JSON.stringify(body) }));

describe("contact numbers", () => {
  it("writes Bangladeshi mobiles one way and keeps other numbers as typed", () => {
    for (const raw of ["01818521472", "8801818521472", "+880 1818-521472", " 01818 521 472 "]) {
      expect(formatContactNumber(raw)).toBe("+880 1818-521472");
    }
    expect(formatContactNumber("  031  123456 ")).toBe("031 123456");
    expect(telHref("+880 1818-521472")).toBe("tel:+8801818521472");
  });

  it("takes names, skips empty rows, and refuses bad lists", () => {
    expect(normalizeContactPhones([{ number: "01818869523", name: "  General   Secretary " }, { number: "", name: "" }, { number: "01835927634" }])).toEqual([
      { number: "+880 1818-869523", name: "General Secretary" },
      { number: "+880 1835-927634", name: null },
    ]);
    const bad: unknown[] = [
      null,
      [],
      [{ number: "", name: "" }],
      [{ number: "call us", name: "" }],
      [{ number: "123", name: "" }],
      [{ number: "01818521472", name: "x".repeat(61) }],
      [{ number: "01818521472" }, { number: "+880 1818-521472" }],
      Array.from({ length: 7 }, (_, i) => ({ number: `0181852147${i}` })),
    ];
    for (const list of bad) expect(() => normalizeContactPhones(list)).toThrow();
  });

  it("shows the three association numbers until an admin saves a list", async () => {
    expect(await getContactPhones()).toEqual(DEFAULT_CONTACT_PHONES);
    expect(DEFAULT_CONTACT_PHONES.map((p) => p.number)).toEqual(["+880 1818-521472", "+880 1818-869523", "+880 1835-927634"]);
    // A damaged saved value falls back to the defaults.
    await prisma.setting.create({ data: { key: "contact-phones", value: "not json" } });
    expect(await getContactPhones()).toEqual(DEFAULT_CONTACT_PHONES);
  });

  it("an admin changes the list; the public endpoint shows it", async () => {
    const admin = await makeMember({ role: "ADMIN" });
    session.user = { ...admin, role: "ADMIN" };
    const res = await put({ phones: [{ number: "01835927634", name: "President" }, { number: "01818521472", name: null }] });
    expect(res.status).toBe(200);
    expect((await res.json()).updatedBy).toBe(admin.email);

    const shown = await (await publicGet()).json();
    expect(shown.phones).toEqual([
      { number: "+880 1835-927634", name: "President" },
      { number: "+880 1818-521472", name: null },
    ]);
    expect((await (await adminGet()).json()).phones).toEqual(shown.phones);
    expect(await prisma.activityLog.count({ where: { action: "contact_phones.update" } })).toBe(1);

    // A bad list changes nothing.
    expect((await put({ phones: [{ number: "abc" }] })).status).toBe(400);
    expect((await getContactPhones())[0].name).toBe("President");
  });

  it("only admins may read or change the saved list", async () => {
    const member = await makeMember();
    session.user = { ...member, role: "MODERATOR" };
    expect((await adminGet()).status).toBe(403);
    expect((await put({ phones: [{ number: "01818521472" }] })).status).toBe(403);
    await expect(setContactPhones([{ number: "01818521472" }], "x@example.test")).resolves.toBeTruthy();
  });
});
