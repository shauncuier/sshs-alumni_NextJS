import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import prisma from "@/lib/prisma";
import { createMemberAccount, hashMemberPassword } from "@/lib/members/create-member";
import { processProof, proofDirFromUrl, saveProof } from "@/lib/media/proofs";
import { makePdf } from "../helpers/images";
import { resetDatabase } from "../helpers/db";

const auth = vi.hoisted(() => ({ session: null as { user: { email: string; role: string } } | null }));
vi.mock("next-auth", () => ({ getServerSession: async () => auth.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

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

describe("verification queue and proof documents", () => {
  it("lists the proof details with each request", async () => {
    const { request } = await pendingMember();
    const res = await GET(new Request("http://x/api/admin/verifications?status=PENDING"));
    const body = await res.json();
    expect(body.requests[0]).toMatchObject({ id: request.id, proofType: "OTHER", proofNote: "Headmistress letter", proofFileUrl: request.proofFileUrl, proofDeletedAt: null });
  });

  for (const status of ["VERIFIED", "REJECTED"] as const) {
    it(`deletes the proof file after the request is ${status.toLowerCase()}`, async () => {
      const { request, dir } = await pendingMember();
      expect(proofDirFromUrl(request.proofFileUrl!)).toBe(dir);
      const res = await patch({ requestId: request.id, status });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.request).toMatchObject({ status, proofType: "OTHER", proofFileUrl: null, reviewedBy: "admin@example.test" });
      expect(body.request.proofDeletedAt).toBeTruthy();
      const stored = await prisma.verificationRequest.findUniqueOrThrow({ where: { id: request.id } });
      expect(stored).toMatchObject({ status, proofFileUrl: null, proofNote: "Headmistress letter" });
      expect(stored.proofDeletedAt).toBeInstanceOf(Date);
      expect(await exists(dir)).toBe(false);
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
