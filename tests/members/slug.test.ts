import { beforeEach, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "../helpers/db";
import { ensureProfileSlugs, slugBase, uniqueSlug } from "@/lib/members/slug";
import { alumniPath } from "@/lib/members/profile-path";
import { createMemberAccount, hashMemberPassword } from "@/lib/members/create-member";
import { GET as profileRoute } from "@/app/api/alumni/[id]/route";
import { GET as directory } from "@/app/api/alumni/route";

beforeEach(async () => {
  await resetDatabase();
});

describe("profile slugs", () => {
  it("writes the name in plain letters with the batch", () => {
    expect(slugBase("Md. Nahidul Islam", 2008)).toBe("md-nahidul-islam-2008");
    expect(slugBase("  José   Ñúñez ", 1999)).toBe("jose-nunez-1999");
    expect(slugBase("মোঃ রহিম", 2010)).toBe("alumni-2010");
    expect(slugBase("Rafiq", null)).toBe("rafiq");
    expect(slugBase("A".repeat(150), 2001).length).toBeLessThanOrEqual(105);
    expect(alumniPath({ id: "abc", slug: "rafiq-2001" })).toBe("/alumni/rafiq-2001");
    expect(alumniPath({ id: "abc", slug: null })).toBe("/alumni/abc");
  });

  it("numbers members who share a name and batch", async () => {
    const a = await makeMember();
    await prisma.alumniProfile.update({ where: { userId: a.id }, data: { slug: "rafiq-2001" } });
    expect(await uniqueSlug(prisma, "rafiq-2001")).toBe("rafiq-2001-2");
    const b = await makeMember();
    await prisma.alumniProfile.update({ where: { userId: b.id }, data: { slug: "rafiq-2001-2" } });
    expect(await uniqueSlug(prisma, "rafiq-2001")).toBe("rafiq-2001-3");
    expect(await uniqueSlug(prisma, "rafiq-20")).toBe("rafiq-20");
  });

  it("a new member gets one; existing members get one from the seed", async () => {
    const hash = await hashMemberPassword("Member-Pw-2026");
    const created = await prisma.$transaction((tx) =>
      createMemberAccount(tx, { fullName: "Nusrat Jahan", email: "n@example.test", password: "Member-Pw-2026", sscBatch: 2005 }, hash)
    );
    expect((await prisma.alumniProfile.findUniqueOrThrow({ where: { userId: created.id } })).slug).toBe("nusrat-jahan-2005");

    const old1 = await makeMember();
    const old2 = await makeMember();
    await prisma.alumniProfile.updateMany({ where: { userId: { in: [old1.id, old2.id] } }, data: { fullName: "Same Name", slug: null } });
    expect(await ensureProfileSlugs()).toBe(2);
    const slugs = (await prisma.alumniProfile.findMany({ where: { userId: { in: [old1.id, old2.id] } }, select: { slug: true } })).map((p) => p.slug).sort();
    expect(slugs).toEqual(["same-name-2000", "same-name-2000-2"]);
    expect(await ensureProfileSlugs()).toBe(0);
  });

  it("the profile API finds a member by slug, and the directory gives it", async () => {
    const m = await makeMember();
    await prisma.alumniProfile.update({ where: { userId: m.id }, data: { slug: "member-x-2000" } });
    const res = await profileRoute(new Request("http://x"), { params: Promise.resolve({ id: "member-x-2000" }) });
    expect(res.status).toBe(200);
    expect((await res.json()).alumni.slug).toBe("member-x-2000");
    const { alumni } = await (await directory(new Request("http://x/api/alumni"))).json();
    expect(alumni.find((a: { userId: string }) => a.userId === m.id).slug).toBe("member-x-2000");
  });
});
