import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";

import sharp from "sharp";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";
import { makeImage, makeImageWithExif, makePdf } from "./helpers/images";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { createNews, deleteNews, getPublishedNews, listPublishedNews, updateNews } from "@/lib/news";
import { contentImagePath, processContentImage, saveContentImage } from "@/lib/media/content-images";
import { POST as uploadImage } from "@/app/api/admin/media/route";
import { GET as serveImage } from "@/app/api/media/content/[id]/[file]/route";
import { GET as listAdmin, POST as createRoute } from "@/app/api/admin/news/route";
import { PATCH as patchRoute } from "@/app/api/admin/news/[id]/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});
afterAll(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

const article = {
  title: "Reunion registration opens",
  category: "Alumni News",
  content: "Registration for the Golden Jubilee reunion is now open.\n\nPay by bKash and submit the transaction ID.",
};
const json = (body: unknown, method = "POST") => new Request("http://x/api", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const asAdmin = async () => {
  const admin = await makeMember({ role: "ADMIN", email: "boss@example.test" });
  session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
};

describe("news", () => {
  it("drafts are hidden; publishing makes an article public", async () => {
    const draft = await createNews(article, "boss@example.test");
    expect(draft).toMatchObject({ isPublished: false, author: "Praktan Sabujian Parishad" });
    expect(draft.excerpt).toBe("Registration for the Golden Jubilee reunion is now open.");
    expect(await listPublishedNews()).toEqual([]);
    expect(await getPublishedNews(draft.id)).toBeNull();

    const { published } = await updateNews(draft.id, { isPublished: true }, "boss@example.test");
    expect(published).toBe(true);
    const list = await listPublishedNews();
    expect(list.map((n) => n.id)).toEqual([draft.id]);
    expect(list[0].featuredImage).toBe("/golden-jubilee-art.jpg");
    expect((await getPublishedNews(draft.id))?.content).toContain("bKash");
  });

  it("lists featured articles first", async () => {
    const a = await createNews({ ...article, title: "Older", isPublished: true }, "x@y.test");
    const b = await createNews({ ...article, title: "Featured", isPublished: true, isFeatured: true }, "x@y.test");
    await createNews({ ...article, title: "Newest", isPublished: true }, "x@y.test");
    const titles = (await listPublishedNews()).map((n) => n.title);
    expect(titles[0]).toBe("Featured");
    expect(titles).toContain("Older");
    expect([a.id, b.id]).toHaveLength(2);
  });

  it("refuses bad input and outside image links", async () => {
    await expect(createNews({ ...article, title: "x" }, "a")).rejects.toMatchObject({ status: 400 });
    await expect(createNews({ ...article, category: "Gossip" }, "a")).rejects.toMatchObject({ status: 400 });
    await expect(createNews({ ...article, content: "short" }, "a")).rejects.toMatchObject({ status: 400 });
    for (const url of ["https://evil.example/x.jpg", "javascript:alert(1)", "/api/media/avatars/abc/avatar.webp"]) {
      await expect(createNews({ ...article, featuredImage: url }, "a")).rejects.toMatchObject({ status: 400 });
    }
  });

  it("deleting an article, or replacing its image, removes the old image file", async () => {
    const one = await saveContentImage(await processContentImage(await makeImage(800, 600)));
    const two = await saveContentImage(await processContentImage(await makeImage(800, 600)));
    const created = await createNews({ ...article, featuredImage: one.url }, "a");
    await updateNews(created.id, { featuredImage: two.url }, "a");
    await expect(fs.access(contentImagePath(one.id, "large.webp")!)).rejects.toThrow();
    await deleteNews(created.id);
    await expect(fs.access(contentImagePath(two.id, "large.webp")!)).rejects.toThrow();
  });
});

describe("content images", () => {
  it("makes WebP files without camera or location data, and serves them publicly", async () => {
    const processed = await processContentImage(await makeImageWithExif(1200, 900));
    const meta = await sharp(processed.large).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    const saved = await saveContentImage(processed);
    const res = await serveImage(new Request("http://x"), { params: Promise.resolve({ id: saved.id, file: "thumb.webp" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
  });

  it("refuses non-images, tiny images and path tricks", async () => {
    await expect(processContentImage(makePdf())).rejects.toMatchObject({ status: 400 });
    await expect(processContentImage(await makeImage(100, 100))).rejects.toMatchObject({ status: 400 });
    expect(contentImagePath("../../etc", "large.webp")).toBeNull();
    expect(contentImagePath("a".repeat(32), "original.jpg")).toBeNull();
  });

  it("uploads are admin-only", async () => {
    const form = new FormData();
    form.append("image", new File([new Uint8Array(await makeImage(800, 600))], "x.jpg", { type: "image/jpeg" }));
    expect((await uploadImage(new Request("http://x", { method: "POST", body: form }))).status).toBe(403);
    await asAdmin();
    const form2 = new FormData();
    form2.append("image", new File([new Uint8Array(await makeImage(800, 600))], "x.jpg", { type: "image/jpeg" }));
    const res = await uploadImage(new Request("http://x", { method: "POST", body: form2 }));
    expect(res.status).toBe(201);
    expect((await res.json()).url).toMatch(/^\/api\/media\/content\/[a-f0-9]{32}\/large\.webp$/);
  });
});

describe("admin news routes", () => {
  it("are admin-only and log publishing", async () => {
    expect((await listAdmin()).status).toBe(403);
    expect((await createRoute(json(article))).status).toBe(403);
    await asAdmin();
    const created = await (await createRoute(json(article))).json();
    const res = await patchRoute(json({ isPublished: true }, "PATCH"), { params: Promise.resolve({ id: created.article.id }) });
    expect(res.status).toBe(200);
    const actions = (await prisma.activityLog.findMany()).map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(["news.drafted", "news.published"]));
    expect((await (await listAdmin()).json()).articles).toHaveLength(1);
  });
});

