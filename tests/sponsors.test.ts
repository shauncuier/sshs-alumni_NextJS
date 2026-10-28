import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import prisma from "@/lib/prisma";
import { createSponsor, deleteSponsor, getFeaturedSponsor, groupSponsors, listSponsors, seedLaunchSponsors, updateSponsor, LAUNCH_SPONSORS } from "@/lib/sponsors";
import { POST as createSponsorRoute } from "@/app/api/admin/sponsors/route";
import { GET as featuredRoute } from "@/app/api/sponsors/featured/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

const json = (body: unknown) => new Request("http://x/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const signIn = async (role: "ADMIN" | "MODERATOR") => {
  const user = await makeMember({ role, email: `${role.toLowerCase()}@example.test` });
  session.user = { id: user.id, email: user.email, role };
};

describe("sponsors", () => {
  it("groups published sponsors by kind, in the fixed kind order and the admin's order", async () => {
    await createSponsor({ category: "SUPPORTER", name: "Rahim Traders" });
    await createSponsor({ category: "INFRASTRUCTURE", name: "Hosting Foundation" });
    await createSponsor({ category: "SUPPORTER", name: "Karim Store" });
    await createSponsor({ category: "EVENT", name: "Hidden Sponsor", isPublished: false });
    const groups = groupSponsors(await listSponsors({ publishedOnly: true }));
    expect(groups.map((g) => [g.category, g.sponsors.map((s) => s.name)])).toEqual([
      ["INFRASTRUCTURE", ["Hosting Foundation"]],
      ["SUPPORTER", ["Rahim Traders", "Karim Store"]],
    ]);
    expect((await listSponsors()).map((s) => s.name)).toContain("Hidden Sponsor");
  });

  it("features the first published infrastructure sponsor", async () => {
    expect(await getFeaturedSponsor()).toBeNull();
    const hidden = await createSponsor({ category: "INFRASTRUCTURE", name: "Not Yet Announced", isPublished: false });
    const shown = await createSponsor({ category: "INFRASTRUCTURE", name: "Hosting Foundation", nameEn: "Hosting Foundation" });
    expect((await getFeaturedSponsor())?.id).toBe(shown.id);
    await updateSponsor(hidden.id, { isPublished: true, sortOrder: 0 });
    expect((await getFeaturedSponsor())?.id).toBe(hidden.id);
    const res = await featuredRoute();
    expect((await res.json()).sponsor).toEqual({ name: "Not Yet Announced", nameEn: null, address: null, logoUrl: null });
  });

  it("checks the kind, website and logo", async () => {
    await expect(createSponsor({ category: "GOLD", name: "Rahim Traders" })).rejects.toMatchObject({ status: 400 });
    await expect(createSponsor({ category: "EVENT", name: "R" })).rejects.toMatchObject({ status: 400 });
    await expect(createSponsor({ category: "EVENT", name: "Rahim Traders", website: "javascript:alert(1)" })).rejects.toMatchObject({ status: 400 });
    await expect(createSponsor({ category: "EVENT", name: "Rahim Traders", logoUrl: "https://elsewhere.example/logo.png" })).rejects.toMatchObject({ status: 400 });
    const ok = await createSponsor({ category: "EVENT", name: "Rahim Traders", website: "https://rahim.example", logoUrl: "/sponsors/tasf-logo.png" });
    expect(ok).toMatchObject({ website: "https://rahim.example", logoUrl: "/sponsors/tasf-logo.png", isPublished: true });
    await deleteSponsor(ok.id);
    expect(await listSponsors()).toEqual([]);
  });

  it("adds each launch sponsor once, and not again after it is removed", async () => {
    expect(await seedLaunchSponsors()).toEqual(LAUNCH_SPONSORS.map((l) => l.sponsor.name));
    const groups = groupSponsors(await listSponsors({ publishedOnly: true }));
    expect(groups.map((g) => [g.category, g.sponsors.map((s) => s.logoUrl)])).toEqual([
      ["INFRASTRUCTURE", ["/sponsors/tasf-logo.png"]],
      ["DEVELOPMENT", ["/sponsors/3s-soft-logo.webp"]],
    ]);
    expect((await getFeaturedSponsor())?.nameEn).toBe("Tofazzal Ahmed Smrity Foundation");
    expect(await seedLaunchSponsors()).toEqual([]);
    const [first] = await listSponsors();
    await deleteSponsor(first.id);
    expect(await seedLaunchSponsors()).toEqual([]);
    expect(await prisma.sponsor.count()).toBe(1);
  });

  it("adds a launch sponsor that is new to a database that already has the others", async () => {
    await prisma.setting.create({ data: { key: LAUNCH_SPONSORS[0].key, value: "earlier" } });
    expect(await seedLaunchSponsors()).toEqual(["3S-SOFT"]);
  });

  it("lets only admins manage them", async () => {
    await signIn("MODERATOR");
    expect((await createSponsorRoute(json({ category: "EVENT", name: "Rahim Traders" }))).status).toBe(403);
    await signIn("ADMIN");
    expect((await createSponsorRoute(json({ category: "EVENT", name: "Rahim Traders" }))).status).toBe(201);
  });
});
