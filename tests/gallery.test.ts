import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";
import { makeImage } from "./helpers/images";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { addPhoto, createAlbum, deleteAlbum, deletePhoto, latestPublishedPhotos, listPublishedPhotos, updateAlbum } from "@/lib/gallery";
import { contentImagePath, processContentImage, saveContentImage } from "@/lib/media/content-images";
import { GET as listRoute, POST as createRoute } from "@/app/api/admin/gallery/route";
import { POST as addPhotoRoute } from "@/app/api/admin/gallery/[id]/photos/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});
afterAll(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

const upload = async () => saveContentImage(await processContentImage(await makeImage(800, 600)));
const exists = (id: string) => fs.access(contentImagePath(id, "large.webp")!).then(() => true, () => false);
const album = { title: "Golden Jubilee 2026", category: "Reunions", year: 2026 };
const json = (body: unknown) => new Request("http://x/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("gallery albums", () => {
  it("unpublished albums stay hidden; publishing needs photos and shows them", async () => {
    const a = await createAlbum(album, "boss@example.test");
    expect(a.isPublished).toBe(false);
    await expect(updateAlbum(a.id, { isPublished: true }, "x")).rejects.toMatchObject({ status: 400 });

    const img = await upload();
    await addPhoto(a.id, { imageUrl: img.url, caption: "Main stage" }, "boss@example.test");
    expect(await listPublishedPhotos()).toEqual([]);
    expect(await latestPublishedPhotos(4)).toEqual([]);

    const { album: published, published: wasPublished } = await updateAlbum(a.id, { isPublished: true }, "x");
    expect(wasPublished).toBe(true);
    expect(published.coverUrl).toBe(img.url);
    const photos = await listPublishedPhotos();
    expect(photos).toHaveLength(1);
    expect(photos[0]).toMatchObject({ caption: "Main stage", albumCategory: "Reunions", year: 2026, imageUrl: img.url, thumbUrl: img.thumbUrl });
    expect(await latestPublishedPhotos(4)).toHaveLength(1);
  });

  it("only accepts uploaded images, and covers from the album itself", async () => {
    const a = await createAlbum(album, "x");
    await expect(addPhoto(a.id, { imageUrl: "https://elsewhere.example/p.jpg" }, "x")).rejects.toMatchObject({ status: 400 });
    const other = await upload();
    await expect(updateAlbum(a.id, { coverUrl: other.url }, "x")).rejects.toMatchObject({ status: 400 });
    await expect(createAlbum({ ...album, category: "Parties" }, "x")).rejects.toMatchObject({ status: 400 });
    await expect(createAlbum({ ...album, year: 1800 }, "x")).rejects.toMatchObject({ status: 400 });
  });

  it("deleting photos removes files, resets the cover and unpublishes an empty album", async () => {
    const a = await createAlbum(album, "x");
    const one = await upload();
    const two = await upload();
    const p1 = await addPhoto(a.id, { imageUrl: one.url }, "x");
    await addPhoto(a.id, { imageUrl: two.url }, "x");
    await updateAlbum(a.id, { coverUrl: one.url, isPublished: true }, "x");

    await deletePhoto(p1.id, "x");
    expect(await exists(one.id)).toBe(false);
    let row = await prisma.galleryAlbum.findUniqueOrThrow({ where: { id: a.id } });
    expect(row).toMatchObject({ coverUrl: null, photosCount: 1, isPublished: true });

    const p2 = await prisma.galleryPhoto.findFirstOrThrow({ where: { albumId: a.id } });
    await deletePhoto(p2.id, "x");
    row = await prisma.galleryAlbum.findUniqueOrThrow({ where: { id: a.id } });
    expect(row).toMatchObject({ photosCount: 0, isPublished: false });
  });

  it("deleting an album removes every photo file", async () => {
    const a = await createAlbum(album, "x");
    const imgs = [await upload(), await upload()];
    for (const img of imgs) await addPhoto(a.id, { imageUrl: img.url }, "x");
    await deleteAlbum(a.id);
    for (const img of imgs) expect(await exists(img.id)).toBe(false);
    expect(await prisma.galleryPhoto.count()).toBe(0);
  });
});

describe("admin gallery routes", () => {
  it("are admin-only and log changes", async () => {
    expect((await listRoute()).status).toBe(403);
    expect((await createRoute(json(album))).status).toBe(403);

    const admin = await makeMember({ role: "ADMIN", email: "boss@example.test" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    const created = await (await createRoute(json(album))).json();
    const img = await upload();
    const res = await addPhotoRoute(json({ imageUrl: img.url }), { params: Promise.resolve({ id: created.album.id }) });
    expect(res.status).toBe(201);
    const actions = (await prisma.activityLog.findMany()).map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(["album.created", "photo.added"]));
  });
});
