/**
 * Feed posts as plain text for the paper magazine (souvenir book). The committee
 * picks a date range, searches, and copies the text into the magazine layout
 * (/admin/feed). Nothing here changes a post.
 */

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { MagazinePost } from "@/lib/magazine-text";

export * from "@/lib/magazine-text";


export const MAGAZINE_PAGE_SIZE = 50;


export interface MagazineQuery {
  q?: string | null;
  /** YYYY-MM-DD, inclusive, Bangladesh time. */
  from?: string | null;
  to?: string | null;
  page?: number;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function listMagazinePosts(query: MagazineQuery): Promise<{ posts: MagazinePost[]; total: number; page: number; pageSize: number }> {
  const where: Prisma.PostWhereInput = { author: { disabledAt: null } };
  const createdAt: Prisma.DateTimeFilter = {};
  if (query.from && DAY.test(query.from)) createdAt.gte = new Date(`${query.from}T00:00:00+06:00`);
  if (query.to && DAY.test(query.to)) createdAt.lte = new Date(`${query.to}T23:59:59.999+06:00`);
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;
  const q = query.q?.trim();
  if (q) {
    where.OR = [{ content: { contains: q } }, { author: { email: { contains: q } } }, { author: { profile: { fullName: { contains: q } } } }];
  }
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const [total, rows] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * MAGAZINE_PAGE_SIZE,
      take: MAGAZINE_PAGE_SIZE,
      include: { author: { select: { email: true, profile: { select: { fullName: true, sscBatch: true } } } } },
    }),
  ]);
  return {
    posts: rows.map((p) => ({
      id: p.id,
      authorName: p.author.profile?.fullName || p.author.email.split("@")[0],
      authorBatch: p.author.profile?.sscBatch ?? null,
      batchTag: p.batchTag,
      createdAt: p.createdAt.toISOString(),
      editedAt: p.editedAt ? p.editedAt.toISOString() : null,
      content: p.content,
    })),
    total,
    page,
    pageSize: MAGAZINE_PAGE_SIZE,
  };
}
