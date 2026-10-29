import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import type { PostItem } from "@/lib/data";
import { can } from "@/lib/permissions";
import { relativeTime } from "@/lib/utils";
import { initialsAvatar } from "@/lib/avatar";

/**
 * The community feed: posts, likes and comments by members, all stored. Authors
 * can edit and delete their own posts and delete their own comments; admins and
 * moderators ("feed" area) can edit and delete anyone's. Post.likesCount and Post.commentsCount are kept in step
 * inside the same transaction as the like or comment.
 */

export const POST_MAX = 5000;
export const COMMENT_MAX = 1000;
const PAGE_SIZE = 50;

type Actor = { id: string; email: string; role: string };

export interface FeedComment {
  id: string;
  authorName: string;
  authorBatch: number | null;
  content: string;
  createdAt: string;
  canDelete: boolean;
}


const authorSelect = {
  id: true,
  role: true,
  status: true,
  email: true,
  profile: { select: { id: true, fullName: true, avatarUrl: true, sscBatch: true, profession: true } },
} satisfies Prisma.UserSelect;

type PostRow = Prisma.PostGetPayload<{ include: { author: { select: typeof authorSelect } } }>;

function toPostItem(p: PostRow, viewer: Actor | null, likedIds: Set<string>): PostItem {
  const name = p.author.profile?.fullName || p.author.email.split("@")[0];
  const avatar = p.author.profile?.avatarUrl && p.author.profile.avatarUrl !== "/logo.png" ? p.author.profile.avatarUrl : initialsAvatar(name);
  const staff = p.author.role === "ADMIN" || p.author.role === "SUPER_ADMIN" || p.author.role === "MODERATOR";
  return {
    id: p.id,
    author: {
      name,
      avatar,
      batch: p.author.profile?.sscBatch ?? 0,
      profession: p.author.profile?.profession || (staff ? "Alumni Committee" : "Alumnus"),
      isVerified: p.author.status === "VERIFIED" || staff,
    },
    authorId: p.authorId,
    profileId: p.author.profile?.id ?? null,
    timestamp: relativeTime(p.createdAt),
    content: p.content,
    likesCount: p.likesCount,
    commentsCount: p.commentsCount,
    batchTag: p.batchTag ?? undefined,
    isLiked: likedIds.has(p.id),
    canDelete: Boolean(viewer && (viewer.id === p.authorId || can(viewer.role, "feed"))),
    canEdit: Boolean(viewer && (viewer.id === p.authorId || can(viewer.role, "feed"))),
    editedAt: p.editedAt ? relativeTime(p.editedAt) : null,
  };
}

export async function listFeed(viewer: Actor | null, opts: { batch?: number | null; limit?: number } = {}): Promise<PostItem[]> {
  const where: Prisma.PostWhereInput = { author: { disabledAt: null } };
  if (opts.batch) where.batchTag = opts.batch;
  const rows = await prisma.post.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: Math.min(opts.limit ?? PAGE_SIZE, PAGE_SIZE),
    include: { author: { select: authorSelect } },
  });
  const liked = viewer
    ? await prisma.postLike.findMany({ where: { userId: viewer.id, postId: { in: rows.map((r) => r.id) } }, select: { postId: true } })
    : [];
  const likedIds = new Set(liked.map((l) => l.postId));
  return rows.map((r) => toPostItem(r, viewer, likedIds));
}

function cleanContent(raw: unknown): string {
  const content = typeof raw === "string" ? raw.trim() : "";
  if (!content) throw new AppError("INVALID_POST", 400, "Post content cannot be empty.");
  if (content.length > POST_MAX) throw new AppError("INVALID_POST", 400, `Post content cannot exceed ${POST_MAX} characters.`);
  return content;
}

/** The batch tag from the form, or null if none was given or it is not a plausible SSC year. */
function cleanBatchTag(raw: unknown): number | null {
  const tag = Number(raw);
  return Number.isInteger(tag) && tag >= 1950 && tag <= new Date().getFullYear() ? tag : null;
}

export async function createPost(actor: Actor, input: { content?: unknown; batchTag?: unknown }): Promise<PostItem> {
  const content = cleanContent(input.content);
  const profile = await prisma.alumniProfile.findUnique({ where: { userId: actor.id }, select: { sscBatch: true } });
  const batchTag = cleanBatchTag(input.batchTag) ?? profile?.sscBatch ?? null;
  const row = await prisma.post.create({ data: { authorId: actor.id, content, batchTag }, include: { author: { select: authorSelect } } });
  return toPostItem(row, actor, new Set());
}

/**
 * Changes a post's text (and batch tag, when a valid one is given) by its author or
 * a moderator. The post keeps its original date; editedAt records the change.
 */
export async function updatePost(actor: Actor, id: string, input: { content?: unknown; batchTag?: unknown }): Promise<PostItem> {
  const content = cleanContent(input.content);
  const post = await postOrThrow(id);
  if (post.authorId !== actor.id && !can(actor.role, "feed")) throw new AppError("FORBIDDEN", 403, "You can only edit your own posts.");
  const batchTag = cleanBatchTag(input.batchTag);
  const row = await prisma.post.update({
    where: { id },
    data: { content, editedAt: new Date(), ...(batchTag ? { batchTag } : {}) },
    include: { author: { select: authorSelect } },
  });
  const liked = await prisma.postLike.findFirst({ where: { postId: id, userId: actor.id }, select: { postId: true } });
  return toPostItem(row, actor, new Set(liked ? [id] : []));
}

async function postOrThrow(id: string) {
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true, content: true } });
  if (!post) throw new AppError("POST_NOT_FOUND", 404, "This post no longer exists.");
  return post;
}

export async function deletePost(actor: Actor, id: string): Promise<{ authorId: string; preview: string }> {
  const post = await postOrThrow(id);
  if (post.authorId !== actor.id && !can(actor.role, "feed")) throw new AppError("FORBIDDEN", 403, "You can only delete your own posts.");
  await prisma.post.delete({ where: { id } });
  return { authorId: post.authorId, preview: post.content.slice(0, 80) };
}

/** Likes the post, or removes the like; returns the new state. */
export async function toggleLike(actor: Actor, postId: string): Promise<{ liked: boolean; likesCount: number }> {
  await postOrThrow(postId);
  return prisma.$transaction(async (tx) => {
    const removed = await tx.postLike.deleteMany({ where: { postId, userId: actor.id } });
    if (removed.count > 0) {
      const post = await tx.post.update({ where: { id: postId }, data: { likesCount: { decrement: 1 } }, select: { likesCount: true } });
      return { liked: false, likesCount: Math.max(0, post.likesCount) };
    }
    await tx.postLike.create({ data: { postId, userId: actor.id } });
    const post = await tx.post.update({ where: { id: postId }, data: { likesCount: { increment: 1 } }, select: { likesCount: true } });
    return { liked: true, likesCount: post.likesCount };
  });
}

export async function listComments(viewer: Actor | null, postId: string): Promise<FeedComment[]> {
  const rows = await prisma.comment.findMany({
    where: { postId, author: { disabledAt: null } },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { author: { select: { id: true, email: true, profile: { select: { fullName: true, sscBatch: true } } } } },
  });
  return rows.map((c) => ({
    id: c.id,
    authorName: c.author.profile?.fullName || c.author.email.split("@")[0],
    authorBatch: c.author.profile?.sscBatch ?? null,
    content: c.content,
    createdAt: relativeTime(c.createdAt),
    canDelete: Boolean(viewer && (viewer.id === c.authorId || can(viewer.role, "feed"))),
  }));
}

export async function addComment(actor: Actor, postId: string, rawContent: unknown): Promise<FeedComment> {
  const content = typeof rawContent === "string" ? rawContent.trim() : "";
  if (!content) throw new AppError("INVALID_COMMENT", 400, "Write a comment first.");
  if (content.length > COMMENT_MAX) throw new AppError("INVALID_COMMENT", 400, `Keep comments to ${COMMENT_MAX} characters or fewer.`);
  const post = await postOrThrow(postId);
  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { postId, authorId: actor.id, content },
      include: { author: { select: { email: true, profile: { select: { fullName: true, sscBatch: true } } } } },
    });
    await tx.post.update({ where: { id: postId }, data: { commentsCount: { increment: 1 } } });
    // Tell the post's author, unless they commented on their own post.
    if (post.authorId !== actor.id) {
      const who = created.author.profile?.fullName || created.author.email.split("@")[0];
      await tx.notification.create({
        data: { userId: post.authorId, type: "POST", title: "New comment", message: `${who} commented on your post.`, link: "/feed" },
      });
    }
    return created;
  });
  return {
    id: comment.id,
    authorName: comment.author.profile?.fullName || comment.author.email.split("@")[0],
    authorBatch: comment.author.profile?.sscBatch ?? null,
    content: comment.content,
    createdAt: relativeTime(comment.createdAt),
    canDelete: true,
  };
}

export async function deleteComment(actor: Actor, commentId: string): Promise<{ postId: string; authorId: string }> {
  const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { id: true, postId: true, authorId: true } });
  if (!comment) throw new AppError("COMMENT_NOT_FOUND", 404, "This comment no longer exists.");
  if (comment.authorId !== actor.id && !can(actor.role, "feed")) throw new AppError("FORBIDDEN", 403, "You can only delete your own comments.");
  await prisma.$transaction([
    prisma.comment.delete({ where: { id: commentId } }),
    prisma.post.update({ where: { id: comment.postId }, data: { commentsCount: { decrement: 1 } } }),
  ]);
  return { postId: comment.postId, authorId: comment.authorId };
}
