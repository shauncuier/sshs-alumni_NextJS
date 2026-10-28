import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import prisma from "@/lib/prisma";
import { createMemberAccount, hashMemberPassword } from "@/lib/members/create-member";
import { processProof, proofDirFromUrl, saveProof } from "@/lib/media/proofs";
import { makePdf } from "../helpers/images";
import { resetDatabase } from "../helpers/db";

const auth = vi.hoisted(() => ({ session: null as { user: { email: string; role: string } } | null }));
vi.mock("@/lib/session-user", () => ({
  getSessionUser: async () => auth.session?.user ?? null,
  isAdminRole: (role: string) => role === "ADMIN" || role === "SUPER_ADMIN",
}));
import { GET, PATCH } from "@/app/api/admin/verifications/route";

beforeEach(async () => {
  auth.session = { user: { email: "admin@example.test", role: "ADMIN" } };
  await resetDatabase();
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});
afterAll(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

/** A pending member who joined outside the Jubilee (no pending payment), with a proof on file. */
async function pendingMember() {
  const saved = await saveProof(await processProof(makePdf()));
  const input = {
    fullName: "Queue Member",
    email: "queue@example.test",
    password: "Member-Pw-2026",
    sscBatch: 2004,
    proofType: "OTHER",
    proofNote: "Headmistress letter",
    proofFileUrl: saved.fileUrl,
    proofMime: saved.mime,
  };
  const hash = await hashMemberPassword(input.password);
  await prisma.$transaction((tx) => createMemberAccount(tx, input, hash));
  const request = await prisma.verificationRequest.findFirstOrThrow({ where: { user: { email: input.email } } });
  return { request, dir: saved.dir };
}
const exists = (dir: string) => fs.access(dir).then(() => true, () => false);
const patch = (body: unknown) =>
  PATCH(new Request("http://x/api/admin/verifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

describe("verification decisions", () => {
  it("decide once: a second decision is 409, an unknown request 404, non-admins 403", async () => {
    const { request } = await pendingMember();
    expect((await patch({ requestId: request.id, status: "VERIFIED" })).status).toBe(200);
    const again = await patch({ requestId: request.id, status: "REJECTED" });
    expect(again.status).toBe(409);
    expect((await again.json()).error).toMatch(/already verified/);
    expect((await prisma.user.findFirstOrThrow({ where: { email: "queue@example.test" } })).status).toBe("VERIFIED");
    expect((await patch({ requestId: "no-such-request", status: "VERIFIED" })).status).toBe(404);
    expect((await patch({ requestId: request.id, status: "MAYBE" })).status).toBe(400);

    auth.session = { user: { email: "mod@example.test", role: "MODERATOR" } };
    expect((await patch({ requestId: request.id, status: "REJECTED" })).status).toBe(403);
  });

  it("writes each decision to the activity log with who decided", async () => {
    const { request } = await pendingMember();
    await patch({ requestId: request.id, status: "REJECTED" });
    const entry = await prisma.activityLog.findFirstOrThrow({ where: { action: "membership.rejected" } });
    expect(entry).toMatchObject({ actorEmail: "admin@example.test", status: "SUCCESS" });
    expect(entry.summary).toMatch(/queue@example.test|Queue Member/);
  });
});

describe("verification queue and proof documents", () => {
  it("lists the proof details with each request", async () => {
    const { request } = await pendingMember();
    const res = await GET(new Request("http://x/api/admin/verifications?status=PENDING"));
    const body = await res.json();
    expect(body.requests[0]).toMatchObject({ id: request.id, proofType: "OTHER", proofNote: "Headmistress letter", proofFileUrl: request.proofFileUrl, proofDeletedAt: null });
  });

  for (const status of ["VERIFIED", "REJECTED"] as const) {
    it(`keeps the proof file after the request is ${status.toLowerCase()}`, async () => {
      const { request, dir } = await pendingMember();
      expect(proofDirFromUrl(request.proofFileUrl!)).toBe(dir);
      const res = await patch({ requestId: request.id, status });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.request).toMatchObject({ status, proofType: "OTHER", proofFileUrl: request.proofFileUrl, proofDeletedAt: null, reviewedBy: "admin@example.test" });
      const stored = await prisma.verificationRequest.findUniqueOrThrow({ where: { id: request.id } });
      expect(stored).toMatchObject({ status, proofFileUrl: request.proofFileUrl, proofNote: "Headmistress letter", proofDeletedAt: null });
      expect(await exists(dir)).toBe(true);
    });
  }

  it("keeps the proof when the decision is refused", async () => {
    const { request, dir } = await pendingMember();
    auth.session = { user: { email: "mod@example.test", role: "MODERATOR" } };
    expect((await patch({ requestId: request.id, status: "VERIFIED" })).status).toBe(403);
    auth.session = { user: { email: "admin@example.test", role: "ADMIN" } };
    expect((await patch({ requestId: request.id, status: "MAYBE" })).status).toBe(400);
    expect(await exists(dir)).toBe(true);
    expect((await prisma.verificationRequest.findUniqueOrThrow({ where: { id: request.id } })).proofFileUrl).toBe(request.proofFileUrl);
  });
});
