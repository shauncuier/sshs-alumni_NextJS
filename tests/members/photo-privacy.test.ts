import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "../helpers/db";
import { makeImage } from "../helpers/images";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user, getMemberSession: async () => (session.user ? { user: session.user } : null) };
});

import { HIDDEN_PHOTO_AVATAR } from "@/lib/avatar";
import { normalizeGender, photoIsPublic } from "@/lib/members/gender";
import { canSeePhoto, shownAvatar } from "@/lib/members/photo-privacy";
import { processAvatar, removeAvatarDir, saveAvatar } from "@/lib/media/avatars";
import { updateUser } from "@/lib/admin/users";
import { GET as directory } from "@/app/api/alumni/route";
import { GET as profileRoute } from "@/app/api/alumni/[id]/route";
import { GET as avatarFile } from "@/app/api/media/avatars/[id]/[file]/route";
import { listFeed, createPost } from "@/lib/feed";
import { PUT as updateProfile } from "@/app/api/profile/route";

const dirs: string[] = [];
afterAll(async () => {
  for (const d of dirs) await removeAvatarDir(d);
});

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

/** A verified member with an uploaded photo. */
async function memberWithPhoto(data: { gender?: string | null; isPhotoPublic?: boolean | null } = {}) {
  const m = await makeMember();
  const saved = await saveAvatar(await processAvatar(await makeImage(800, 800)));
  dirs.push(saved.dir);
  await prisma.alumniProfile.update({ where: { userId: m.id }, data: { avatarUrl: saved.avatarUrl, ...data } });
  const profile = await prisma.alumniProfile.findUniqueOrThrow({ where: { userId: m.id } });
  return { ...m, profileId: profile.id, photoId: saved.id, avatarUrl: saved.avatarUrl };
}

const fetchPhoto = (id: string) =>
  avatarFile(new Request(`http://x/api/media/avatars/${id}/avatar.webp`), { params: Promise.resolve({ id, file: "avatar.webp" }) });
const listed = async () => ((await (await directory(new Request("http://x/api/alumni"))).json()) as { alumni: { userId: string; avatarUrl: string }[] }).alumni;

describe("photo privacy rule", () => {
  it("hides women's photos unless they choose to show them", () => {
    expect(photoIsPublic({ gender: "FEMALE" })).toBe(false);
    expect(photoIsPublic({ gender: "MALE" })).toBe(true);
    expect(photoIsPublic({ gender: null })).toBe(true);
    expect(photoIsPublic({ gender: "FEMALE", isPhotoPublic: true })).toBe(true);
    expect(photoIsPublic({ gender: "MALE", isPhotoPublic: false })).toBe(false);
  });

  it("lets only the member herself and admins see a hidden photo", () => {
    const her = { userId: "u1", gender: "FEMALE" };
    expect(canSeePhoto(her)).toBe(false);
    expect(canSeePhoto(her, { id: "u2", role: "ALUMNI" })).toBe(false);
    expect(canSeePhoto(her, { id: "u2", role: "MODERATOR" })).toBe(false);
    expect(canSeePhoto(her, { id: "u1", role: "ALUMNI" })).toBe(true);
    expect(canSeePhoto(her, { id: "u3", role: "ADMIN" })).toBe(true);
    expect(shownAvatar("/a.webp", her)).toBe(HIDDEN_PHOTO_AVATAR);
    expect(shownAvatar("/a.webp", { userId: "u1", gender: "MALE" })).toBe("/a.webp");
    expect(HIDDEN_PHOTO_AVATAR).toMatch(/^data:image\/svg\+xml/);
  });

  it("reads gender from forms", () => {
    expect(normalizeGender("female")).toBe("FEMALE");
    expect(normalizeGender(" MALE ")).toBe("MALE");
    expect(normalizeGender("")).toBeNull();
    expect(() => normalizeGender("other")).toThrow();
  });
});

describe("hidden photos on the site", () => {
  it("the directory and profile page show the silhouette to others, the photo to her", async () => {
    const her = await memberWithPhoto({ gender: "FEMALE" });
    const him = await memberWithPhoto({ gender: "MALE" });
    const byUser = async () => Object.fromEntries((await listed()).map((a) => [a.userId, a.avatarUrl]));

    expect(await byUser()).toMatchObject({ [her.id]: HIDDEN_PHOTO_AVATAR, [him.id]: him.avatarUrl });
    const page = await (await profileRoute(new Request("http://x"), { params: Promise.resolve({ id: her.profileId }) })).json();
    expect(page.alumni.avatarUrl).toBe(HIDDEN_PHOTO_AVATAR);

    session.user = { id: her.id, email: her.email, role: "ALUMNI" };
    expect((await byUser())[her.id]).toBe(her.avatarUrl);

    // She chooses to show it.
    session.user = null;
    await prisma.alumniProfile.update({ where: { userId: her.id }, data: { isPhotoPublic: true } });
    expect((await byUser())[her.id]).toBe(her.avatarUrl);
  });

  it("the photo file is refused to anyone else while hidden", async () => {
    const her = await memberWithPhoto({ gender: "FEMALE" });
    expect((await fetchPhoto(her.photoId)).status).toBe(404);
    session.user = { id: "someone-else", email: "x@example.test", role: "ALUMNI" };
    expect((await fetchPhoto(her.photoId)).status).toBe(404);

    session.user = { id: her.id, email: her.email, role: "ALUMNI" };
    const own = await fetchPhoto(her.photoId);
    expect(own.status).toBe(200);
    expect(own.headers.get("cache-control")).toBe("private, no-store");
    session.user = { id: "admin", email: "a@example.test", role: "ADMIN" };
    expect((await fetchPhoto(her.photoId)).status).toBe(200);

    const him = await memberWithPhoto({ gender: "MALE" });
    session.user = null;
    const open = await fetchPhoto(him.photoId);
    expect(open.status).toBe(200);
    expect(open.headers.get("cache-control")).toContain("public");
  });

  it("feed posts by her show the silhouette to other members", async () => {
    const her = await memberWithPhoto({ gender: "FEMALE" });
    const reader = await makeMember();
    await createPost({ id: her.id, email: her.email, role: "ALUMNI" }, { content: "Hello batch" });
    const [seen] = await listFeed({ id: reader.id, email: reader.email, role: "ALUMNI" });
    expect(seen.author.avatar).toBe(HIDDEN_PHOTO_AVATAR);
    const [own] = await listFeed({ id: her.id, email: her.email, role: "ALUMNI" });
    expect(own.author.avatar).toBe(her.avatarUrl);
  });

  it("an admin sets an existing member's gender in Admin → Users", async () => {
    const admin = await makeMember({ role: "ADMIN" });
    const her = await memberWithPhoto();
    expect((await listed()).find((a) => a.userId === her.id)?.avatarUrl).toBe(her.avatarUrl);
    const row = await updateUser({ id: admin.id, email: admin.email, role: "ADMIN" }, her.id, { action: "gender", gender: "FEMALE" });
    expect(row.gender).toBe("FEMALE");
    expect((await listed()).find((a) => a.userId === her.id)?.avatarUrl).toBe(HIDDEN_PHOTO_AVATAR);
    await expect(updateUser({ id: admin.id, email: admin.email, role: "ADMIN" }, her.id, { action: "gender", gender: "x" })).rejects.toMatchObject({ status: 400 });
  });

  it("she sets her gender and shows or hides her photo from her profile", async () => {
    const her = await memberWithPhoto();
    session.user = { id: her.id, email: her.email, role: "ALUMNI" };
    const put = (body: unknown) =>
      updateProfile(new Request("http://localhost:3000/api/profile", { method: "PUT", headers: { "content-type": "application/json", origin: "http://localhost:3000" }, body: JSON.stringify(body) }));
    const saved = () => prisma.alumniProfile.findUniqueOrThrow({ where: { userId: her.id } });

    expect((await put({ gender: "FEMALE" })).status).toBe(200);
    expect(await saved()).toMatchObject({ gender: "FEMALE", isPhotoPublic: null });
    expect((await put({ isPhotoPublic: true })).status).toBe(200);
    expect((await saved()).isPhotoPublic).toBe(true);
    // Other fields leave the choice as it is.
    expect((await put({ bio: "hi" })).status).toBe(200);
    expect((await saved()).isPhotoPublic).toBe(true);
    expect((await put({ isPhotoPublic: null })).status).toBe(200);
    expect((await saved()).isPhotoPublic).toBeNull();
    expect((await put({ gender: "other" })).status).toBe(400);
    expect((await put({ isPhotoPublic: "yes" })).status).toBe(400);
  });

  it("she sets her name in Bangla from her profile", async () => {
    const her = await memberWithPhoto();
    session.user = { id: her.id, email: her.email, role: "ALUMNI" };
    const put = (body: unknown) =>
      updateProfile(new Request("http://localhost:3000/api/profile", { method: "PUT", headers: { "content-type": "application/json", origin: "http://localhost:3000" }, body: JSON.stringify(body) }));
    const saved = async () => (await prisma.alumniProfile.findUniqueOrThrow({ where: { userId: her.id } })).fullNameBn;

    expect((await put({ fullNameBn: "নুসরাত জাহান" })).status).toBe(200);
    expect(await saved()).toBe("নুসরাত জাহান");
    expect((await put({ bio: "hi" })).status).toBe(200);
    expect(await saved()).toBe("নুসরাত জাহান");
    expect((await put({ fullNameBn: "Nusrat" })).status).toBe(400);
    expect((await put({ fullNameBn: "" })).status).toBe(200);
    expect(await saved()).toBeNull();
  });
});
