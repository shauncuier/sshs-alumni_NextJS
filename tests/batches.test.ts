import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { FIRST_BATCH, getBatch, isBatchYear, listBatches, updateBatch } from "@/lib/batches";
import { PATCH as patchRoute } from "@/app/api/admin/batches/[year]/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

const patch = (year: number, body: unknown) =>
  patchRoute(new Request("http://x", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), {
    params: Promise.resolve({ year: String(year) }),
  });

describe("batches", () => {
  it("lists every year from the first batch to now, with no invented people", async () => {
    const batches = await listBatches();
    expect(batches[0].year).toBe(new Date().getFullYear());
    expect(batches.at(-1)!.year).toBe(FIRST_BATCH);
    for (const b of batches) {
      expect(b).toMatchObject({ totalAlumni: 0, classRepresentative: "", representativePhone: "" });
      expect(b.reunionDate).toBeUndefined();
    }
  });

  it("counts verified, active members only", async () => {
    await makeMember();
    await makeMember();
    await makeMember({ status: "PENDING" });
    const disabled = await makeMember();
    await prisma.user.update({ where: { id: disabled.id }, data: { disabledAt: new Date() } });
    expect((await getBatch(2000))?.totalAlumni).toBe(2);
  });

  it("admins set the representative, contact and reunion date", async () => {
    await updateBatch(2005, { classRepresentative: "Rafiq Ahmed", representativePhone: "+880 1711-000000", reunionDate: "2027-01-15", tagline: "Class of 2005" });
    const b = await getBatch(2005);
    expect(b).toMatchObject({ classRepresentative: "Rafiq Ahmed", representativePhone: "+880 1711-000000", reunionDateIso: "2027-01-15", tagline: "Class of 2005" });

    // Clearing a field removes it again.
    await updateBatch(2005, { classRepresentative: "" });
    expect((await getBatch(2005))?.classRepresentative).toBe("");
  });

  it("rejects unknown years, bad phones and bad dates", async () => {
    expect(isBatchYear(FIRST_BATCH - 1)).toBe(false);
    expect(await getBatch(1900)).toBeNull();
    await expect(updateBatch(1900, {})).rejects.toMatchObject({ status: 404 });
    await expect(updateBatch(2005, { representativePhone: "call me" })).rejects.toMatchObject({ status: 400 });
    await expect(updateBatch(2005, { reunionDate: "15/01/2027" })).rejects.toMatchObject({ status: 400 });
  });

  it("only admins may edit a batch through the API", async () => {
    expect((await patch(2005, { classRepresentative: "X" })).status).toBe(403);
    const member = await makeMember();
    session.user = { id: member.id, email: member.email, role: "ALUMNI" };
    expect((await patch(2005, { classRepresentative: "X" })).status).toBe(403);
    const mod = await makeMember({ role: "MODERATOR" });
    session.user = { id: mod.id, email: mod.email, role: "MODERATOR" };
    expect((await patch(2005, { classRepresentative: "X" })).status).toBe(403);

    const admin = await makeMember({ role: "ADMIN" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    expect((await patch(2005, { classRepresentative: "Rafiq Ahmed" })).status).toBe(200);
    expect((await getBatch(2005))?.classRepresentative).toBe("Rafiq Ahmed");
    expect(await prisma.activityLog.count({ where: { action: "batch.updated" } })).toBe(1);
  });
});
