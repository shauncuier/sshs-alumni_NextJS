import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import { processProof, removeProofDir, saveProof } from "@/lib/media/proofs";
import { makeImage, makePdf } from "../helpers/images";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", () => ({
  getSessionUser: async () => session.user,
  isAdminRole: (role: string) => role === "ADMIN" || role === "SUPER_ADMIN",
}));

import { GET } from "@/app/api/media/proofs/[id]/[file]/route";

const get = (id: string, file: string) => GET(new Request(`http://x/api/media/proofs/${id}/${file}`), { params: Promise.resolve({ id, file }) });
const as = (role: string) => {
  session.user = { id: "u1", email: `${role.toLowerCase()}@example.test`, role };
};

beforeEach(() => {
  session.user = null;
});
afterAll(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

describe("GET /api/media/proofs/[id]/[file]", () => {
  it("needs a signed-in administrator", async () => {
    const saved = await saveProof(await processProof(makePdf()));
    expect((await get(saved.id, "document.pdf")).status).toBe(401);
    for (const role of ["ALUMNI", "MODERATOR"]) {
      as(role);
      expect((await get(saved.id, "document.pdf")).status).toBe(403);
    }
  });

  it("serves a PDF privately to admins, viewable in the browser's PDF viewer", async () => {
    const saved = await saveProof(await processProof(makePdf()));
    for (const role of ["ADMIN", "SUPER_ADMIN"]) {
      as(role);
      const res = await get(saved.id, "document.pdf");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/pdf");
      expect(res.headers.get("cache-control")).toBe("private, no-store");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("content-disposition")).toBe(`inline; filename="membership-proof-${saved.id}.pdf"`);
      // A sandbox or default-src policy makes Chrome/Edge's PDF viewer show a blocked page.
      expect(res.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
      expect(Buffer.from(await res.arrayBuffer()).equals(makePdf())).toBe(true);
    }
  });

  it("serves an image proof as JPEG with a locked-down policy", async () => {
    const saved = await saveProof(await processProof(await makeImage(400, 300)));
    as("ADMIN");
    const res = await get(saved.id, "document.jpg");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-disposition")).toBe(`inline; filename="membership-proof-${saved.id}.jpg"`);
    expect(res.headers.get("content-security-policy")).toContain("default-src 'none'");
  });

  it("answers 404 for bad ids, unknown files and deleted proofs", async () => {
    const saved = await saveProof(await processProof(makePdf()));
    as("ADMIN");
    expect((await get("../../etc", "document.pdf")).status).toBe(404);
    expect((await get("A".repeat(32), "document.pdf")).status).toBe(404);
    expect((await get(saved.id, "document.jpg")).status).toBe(404); // not the file that was stored
    expect((await get(saved.id, "original.jpg")).status).toBe(404);
    expect((await get(saved.id, "../document.pdf")).status).toBe(404);
    await removeProofDir(saved.dir);
    expect((await get(saved.id, "document.pdf")).status).toBe(404);
  });
});
