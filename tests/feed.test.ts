import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { addComment, createPost, deleteComment, deletePost, listComments, listFeed, toggleLike, updatePost } from "@/lib/feed";
import { GET as listRoute, POST as createRoute } from "@/app/api/posts/route";
import { DELETE as deleteRoute, PATCH as editRoute } from "@/app/api/posts/[id]/route";
import { POST as likeRoute } from "@/app/api/posts/[id]/like/route";
import { GET as commentsRoute, POST as commentRoute } from "@/app/api/posts/[id]/comments/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

const actor = async (role: "ALUMNI" | "ADMIN" | "MODERATOR" = "ALUMNI") => {
  const m = await makeMember({ role });
  return { id: m.id, email: m.email, role };
};
const json = (body: unknown, method = "POST") => new Request("http://x/api", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("feed posts", () => {
  it("stores posts and lists them newest first with the author's real profile", async () => {
    const me = await actor();
    await createPost(me, { content: "First" });
    await new Promise((r) => setTimeout(r, 1100));
    await createPost(me, { content: "Second", batchTag: 2000 });

    const feed = await listFeed(me);
    expect(feed.map((p) => p.content)).toEqual(["Second", "First"]);
    expect(feed[0]).toMatchObject({ authorId: me.id, batchTag: 2000, canDelete: true, isLiked: false });
    expect(feed[0].author.name).toMatch(/^Member \d+$/);
  });

  it("rejects empty and over-long posts", async () => {
    const me = await actor();
    await expect(createPost(me, { content: "   " })).rejects.toMatchObject({ status: 400 });
    await expect(createPost(me, { content: "x".repeat(5001) })).rejects.toMatchObject({ status: 400 });
  });

  it("hides posts by disabled members", async () => {
    const me = await actor();
    const other = await actor();
    await createPost(other, { content: "Gone soon" });
    await prisma.user.update({ where: { id: other.id }, data: { disabledAt: new Date() } });
    expect(await listFeed(me)).toEqual([]);
  });

  it("authors and moderators can delete a post; other members cannot", async () => {
    const author = await actor();
    const stranger = await actor();
    const mod = await actor("MODERATOR");
    const a = await createPost(author, { content: "Mine" });
    const b = await createPost(author, { content: "Also mine" });

    expect((await listFeed(stranger))[0].canDelete).toBe(false);
    await expect(deletePost(stranger, a.id)).rejects.toMatchObject({ status: 403 });
    await deletePost(author, a.id);
    await deletePost(mod, b.id);
    expect(await prisma.post.count()).toBe(0);
  });
});

describe("editing posts", () => {
  it("the author can change the text; the post keeps its date and records when it was edited", async () => {
    const me = await actor();
    const post = await createPost(me, { content: "Typo hear" });
    const before = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(before.editedAt).toBeNull();

    const edited = await updatePost(me, post.id, { content: "Typo here" });
    expect(edited).toMatchObject({ id: post.id, content: "Typo here", canEdit: true });
    expect(edited.editedAt).toBeTruthy();

    const after = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(after.content).toBe("Typo here");
    expect(after.createdAt.getTime()).toBe(before.createdAt.getTime());
    expect(after.editedAt).toBeInstanceOf(Date);
    expect((await listFeed(me))[0]).toMatchObject({ content: "Typo here", canEdit: true });
  });

  it("another member cannot edit it; an admin can", async () => {
    const author = await actor();
    const stranger = await actor();
    const admin = await actor("ADMIN");
    const post = await createPost(author, { content: "Mine" });

    expect((await listFeed(stranger))[0].canEdit).toBe(false);
    await expect(updatePost(stranger, post.id, { content: "Hijacked" })).rejects.toMatchObject({ status: 403 });
    expect((await updatePost(admin, post.id, { content: "Tidied by staff" })).content).toBe("Tidied by staff");
    await expect(updatePost(author, "no-such-post", { content: "x" })).rejects.toMatchObject({ status: 404 });
  });

  it("rejects empty or over-long edits and keeps the batch tag unless a valid one is given", async () => {
    const me = await actor();
    const post = await createPost(me, { content: "Tagged", batchTag: 2000 });
    await expect(updatePost(me, post.id, { content: "  " })).rejects.toMatchObject({ status: 400 });
    await expect(updatePost(me, post.id, { content: "x".repeat(5001) })).rejects.toMatchObject({ status: 400 });
    expect((await updatePost(me, post.id, { content: "Still tagged" })).batchTag).toBe(2000);
    expect((await updatePost(me, post.id, { content: "Retagged", batchTag: 1999 })).batchTag).toBe(1999);
  });
});

describe("likes and comments", () => {
  it("toggles a like once per member and keeps the count in step", async () => {
    const me = await actor();
    const other = await actor();
    const post = await createPost(me, { content: "Like me" });

    expect(await toggleLike(other, post.id)).toMatchObject({ liked: true, likesCount: 1 });
    expect(await toggleLike(me, post.id)).toMatchObject({ liked: true, likesCount: 2 });
    expect(await toggleLike(other, post.id)).toMatchObject({ liked: false, likesCount: 1 });
    expect((await listFeed(me))[0]).toMatchObject({ likesCount: 1, isLiked: true });
    expect((await listFeed(other))[0].isLiked).toBe(false);
  });

  it("stores comments, counts them, and tells the post's author", async () => {
    const author = await actor();
    const other = await actor();
    const post = await createPost(author, { content: "Talk to me" });

    await addComment(other, post.id, "Nice!");
    await addComment(author, post.id, "Thanks");
    const comments = await listComments(author, post.id);
    expect(comments.map((c) => c.content)).toEqual(["Nice!", "Thanks"]);
    expect((await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).commentsCount).toBe(2);

    // One notification: the author's own comment does not notify them.
    const notes = await prisma.notification.findMany({ where: { userId: author.id } });
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ type: "POST", link: "/feed", isRead: false });
  });

  it("only the comment's author or a moderator can delete it", async () => {
    const author = await actor();
    const other = await actor();
    const admin = await actor("ADMIN");
    const post = await createPost(author, { content: "Post" });
    const c1 = await addComment(other, post.id, "One");
    const c2 = await addComment(other, post.id, "Two");

    await expect(deleteComment(author, c1.id)).rejects.toMatchObject({ status: 403 });
    await deleteComment(other, c1.id);
    await deleteComment(admin, c2.id);
    expect((await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).commentsCount).toBe(0);
  });

  it("deleting a post removes its likes and comments", async () => {
    const me = await actor();
    const post = await createPost(me, { content: "Short-lived" });
    await toggleLike(me, post.id);
    await addComment(me, post.id, "Bye");
    await deletePost(me, post.id);
    expect(await prisma.postLike.count()).toBe(0);
    expect(await prisma.comment.count()).toBe(0);
  });
});

describe("feed routes", () => {
  it("require sign-in to read or write", async () => {
    expect((await listRoute(new Request("http://x/api/posts"))).status).toBe(401);
    expect((await createRoute(json({ content: "Hi" }))).status).toBe(401);
    expect((await commentsRoute(new Request("http://x"), params("nope"))).status).toBe(401);
    expect((await likeRoute(json({}), params("nope"))).status).toBe(401);
  });

  it("post, like, comment and delete through the API", async () => {
    const me = await actor();
    session.user = me;

    const created = await createRoute(json({ content: "Hello batch", batchTag: 2000 }));
    expect(created.status).toBe(201);
    const { post } = await created.json();

    expect((await (await listRoute(new Request("http://x/api/posts?limit=5"))).json()).posts).toHaveLength(1);
    expect(await (await likeRoute(json({}), params(post.id))).json()).toMatchObject({ liked: true, likesCount: 1 });
    expect((await commentRoute(json({ content: "First!" }), params(post.id))).status).toBe(201);
    expect((await (await commentsRoute(new Request("http://x"), params(post.id))).json()).comments).toHaveLength(1);

    session.user = await actor();
    expect((await deleteRoute(json({}, "DELETE"), params(post.id))).status).toBe(403);
    session.user = me;
    expect((await deleteRoute(json({}, "DELETE"), params(post.id))).status).toBe(200);
    expect((await likeRoute(json({}), params(post.id))).status).toBe(404);
  });

  it("PATCH /api/posts/[id]: the author or an admin may edit, another member may not", async () => {
    const author = await actor();
    session.user = author;
    const { post } = await (await createRoute(json({ content: "Draft" }))).json();

    session.user = null;
    expect((await editRoute(json({ content: "Nope" }, "PATCH"), params(post.id))).status).toBe(401);

    session.user = await actor();
    expect((await editRoute(json({ content: "Nope" }, "PATCH"), params(post.id))).status).toBe(403);

    session.user = author;
    const mine = await editRoute(json({ content: "Draft, fixed" }, "PATCH"), params(post.id));
    expect(mine.status).toBe(200);
    expect((await mine.json()).post).toMatchObject({ id: post.id, content: "Draft, fixed", canEdit: true });

    session.user = await actor("ADMIN");
    const staff = await editRoute(json({ content: "Draft, moderated" }, "PATCH"), params(post.id));
    expect(staff.status).toBe(200);
    expect((await (await listRoute(new Request("http://x/api/posts"))).json()).posts[0].content).toBe("Draft, moderated");
    expect((await editRoute(json({ content: "" }, "PATCH"), params(post.id))).status).toBe(400);
    expect((await editRoute(json({ content: "x" }, "PATCH"), params("missing"))).status).toBe(404);
  });
});
