import { beforeEach, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "../helpers/db";
import { GET as directory } from "@/app/api/alumni/route";

beforeEach(async () => {
  await resetDatabase();
});

it("lists seniors first: oldest SSC batch, then by name", async () => {
  const members = [
    { name: "Karim", batch: 2010 },
    { name: "Rahim", batch: 1985 },
    { name: "Abul", batch: 2010 },
    { name: "Jamal", batch: 1999 },
  ];
  for (const m of members) {
    const { id } = await makeMember();
    await prisma.alumniProfile.update({ where: { userId: id }, data: { fullName: m.name, sscBatch: m.batch } });
  }
  const { alumni } = await (await directory(new Request("http://x/api/alumni"))).json();
  expect(alumni.map((a: { fullName: string; sscBatch: number }) => `${a.sscBatch} ${a.fullName}`)).toEqual([
    "1985 Rahim",
    "1999 Jamal",
    "2010 Abul",
    "2010 Karim",
  ]);
});
