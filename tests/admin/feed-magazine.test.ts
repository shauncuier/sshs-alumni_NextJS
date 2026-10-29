import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "../helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { createPost } from "@/lib/feed";
import { listMagazinePosts, magazineText, type MagazinePost } from "@/lib/magazine";
import { GET as magazineRoute } from "@/app/api/admin/feed/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

const actor = async (role: "ALUMNI" | "ADMIN" | "MODERATOR" = "ALUMNI") => {
  const m = await makeMember({ role });
  return { id: m.id, email: m.email, role };
};
const sample = (over: Partial<MagazinePost> = {}): MagazinePost => ({
  id: "p1",
  authorName: "Rafiq Ahmed",
  authorBatch: 1998,
  batchTag: 1998,
  createdAt: "2026-10-25T10:30:00.000Z",
  editedAt: null,
  content: "Our batch met at the school gate.",
  ...over,
});

describe("magazine text", () => {
  it("writes each post as plain text with the author, batch and date, separated for the layout", () => {
    const text = magazineText([sample(), sample({ id: "p2", authorName: "Nusrat", authorBatch: null, batchTag: null, createdAt: "2026-01-02T18:30:00.000Z", content: "Line one\r\nLine two" })]);
    expect(text).toBe(
      "Rafiq Ahmed (SSC 1998) — 25 October 2026\n\nOur batch met at the school gate.\n\n* * *\n\nNusrat — 3 January 2026\n\nLine one\nLine two"
    );
  });

  it("keeps no HTML and no stray whitespace", () => {
    const text = magazineText([sample({ content: "  <b>Bold</b> words &amp; more<br>next  " })]);
    expect(text).toContain("Bold words & more\nnext");
    expect(text).not.toMatch(/<|>/);
    expect(magazineText([])).toBe("");
  });
});

describe("listing posts for the magazine", () => {
  it("lists newest first with the author's name and batch, and skips disabled members", async () => {
    const a = await actor();
    const gone = await actor();
    await createPost(a, { content: "Keep me" });
    await createPost(gone, { content: "Hidden" });
    await prisma.user.update({ where: { id: gone.id }, data: { disabledAt: new Date() } });

    const { posts, total } = await listMagazinePosts({});
    expect(total).toBe(1);
    expect(posts[0]).toMatchObject({ content: "Keep me", authorBatch: 2000, batchTag: 2000, editedAt: null });
    expect(posts[0].authorName).toMatch(/^Member \d+$/);
    expect(new Date(posts[0].createdAt).getTime()).toBeGreaterThan(0);
  });

  it("filters by a Bangladesh-time date range and searches text and author", async () => {
    const a = await actor();
    const b = await actor();
    const old = await createPost(a, { content: "From last year" });
    await prisma.post.update({ where: { id: old.id }, data: { createdAt: new Date("2025-03-10T12:00:00+06:00") } });
    const recent = await createPost(b, { content: "Fresh memories of the jubilee" });
    await prisma.post.update({ where: { id: recent.id }, data: { createdAt: new Date("2026-10-20T23:30:00+06:00") } });

    expect((await listMagazinePosts({ from: "2026-10-20", to: "2026-10-20" })).posts.map((p) => p.content)).toEqual(["Fresh memories of the jubilee"]);
    expect((await listMagazinePosts({ from: "2026-10-21" })).posts).toEqual([]);
    expect((await listMagazinePosts({ to: "2025-12-31" })).posts.map((p) => p.content)).toEqual(["From last year"]);
    expect((await listMagazinePosts({ q: "jubilee" })).posts.map((p) => p.content)).toEqual(["Fresh memories of the jubilee"]);
    expect((await listMagazinePosts({ q: b.email })).posts.map((p) => p.content)).toEqual(["Fresh memories of the jubilee"]);
    expect((await listMagazinePosts({ q: "nothing like this" })).total).toBe(0);
  });
});

describe("GET /api/admin/feed", () => {
  it("is for the feed moderators and admins only", async () => {
    const member = await actor();
    await createPost(member, { content: "For the magazine" });
    const req = (query = "") => new Request(`http://x/api/admin/feed${query}`);

    expect((await magazineRoute(req())).status).toBe(403);
    session.user = member;
    expect((await magazineRoute(req())).status).toBe(403);

    session.user = await actor("MODERATOR");
    const mod = await magazineRoute(req("?q=magazine"));
    expect(mod.status).toBe(200);
    expect((await mod.json()).posts).toHaveLength(1);

    session.user = await actor("ADMIN");
    const admin = await magazineRoute(req("?from=2030-01-01"));
    expect(admin.status).toBe(200);
    expect(await admin.json()).toMatchObject({ posts: [], total: 0 });
  });
});
