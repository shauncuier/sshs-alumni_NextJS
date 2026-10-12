import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import { makeImage, makePdf } from "../helpers/images";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { processReceipt, saveReceipt } from "@/lib/media/receipts";
import { POST as uploadImage } from "@/app/api/admin/media/route";
import { GET as getReceipt } from "@/app/api/media/receipts/[id]/[file]/route";

const as = (role: string | null) => {
  session.user = role ? { id: "u1", email: `${role.toLowerCase()}@example.test`, role } : null;
};
beforeEach(() => as(null));
afterAll(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

describe("admin image upload", () => {
  const upload = async () => {
    const form = new FormData();
    form.append("image", new File([new Uint8Array(await makeImage(800, 600))], "photo.jpg", { type: "image/jpeg" }));
    return uploadImage(new Request("http://x/api/admin/media", { method: "POST", body: form }));
  };

  it("is open to the roles that manage content, and no one else", async () => {
    for (const [role, status] of [[null, 403], ["ALUMNI", 403], ["MODERATOR", 201], ["ADMIN", 201], ["SUPER_ADMIN", 201]] as const) {
      as(role);
      expect((await upload()).status, `${role}`).toBe(status);
    }
  });
});

describe("payment screenshots", () => {
  it("are admins only, never cached, and only files the site wrote", async () => {
    const saved = await saveReceipt(await processReceipt(await makeImage(800, 1200)));
    const [, , , , id, file] = saved.fileUrl.split("/");
    const get = (i = id, f = file) => getReceipt(new Request("http://x"), { params: Promise.resolve({ id: i, file: f }) });

    expect((await get()).status).toBe(401);
    as("MODERATOR");
    expect((await get()).status).toBe(403);
    as("ADMIN");
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect((await get(id, "../../etc/passwd")).status).toBe(404);
    expect((await get("not-an-id", file)).status).toBe(404);
  });

  it("PDF receipts may be previewed inside the admin pages, not framed by other sites", async () => {
    const saved = await saveReceipt(await processReceipt(makePdf()));
    const [, , , , id, file] = saved.fileUrl.split("/");
    as("ADMIN");
    const res = await getReceipt(new Request("http://x"), { params: Promise.resolve({ id, file }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-security-policy")).toBe("frame-ancestors 'self'");
  });
});
