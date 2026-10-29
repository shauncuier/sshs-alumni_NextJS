/**
 * Feed posts as plain text for the paper magazine (souvenir book). The committee
 * picks a date range, searches, and copies the text into the magazine layout
 * (/admin/feed). Nothing here changes a post.
 */

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import type { MagazinePost } from "@/lib/magazine-text";

export * from "@/lib/magazine-text";


export const MAGAZINE_PAGE_SIZE = 50;


export interface MagazineQuery {
  /** "feed" (default): members' feed posts; "form": writings sent through the public /magazine form. */
  source?: string | null;
  q?: string | null;
  /** YYYY-MM-DD, inclusive, Bangladesh time. */
  from?: string | null;
  to?: string | null;
  page?: number;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

type Listing = { posts: MagazinePost[]; total: number; page: number; pageSize: number };

/** The createdAt filter for an inclusive YYYY-MM-DD range in Bangladesh time, or undefined. */
function dateRange(query: MagazineQuery): Prisma.DateTimeFilter | undefined {
  const createdAt: Prisma.DateTimeFilter = {};
  if (query.from && DAY.test(query.from)) createdAt.gte = new Date(`${query.from}T00:00:00+06:00`);
  if (query.to && DAY.test(query.to)) createdAt.lte = new Date(`${query.to}T23:59:59.999+06:00`);
  return createdAt.gte || createdAt.lte ? createdAt : undefined;
}

export async function listMagazinePosts(query: MagazineQuery): Promise<Listing> {
  if (query.source === "form") return listSubmissions(query);
  const where: Prisma.PostWhereInput = { author: { disabledAt: null }, createdAt: dateRange(query) };
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

async function listSubmissions(query: MagazineQuery): Promise<Listing> {
  const where: Prisma.MagazineSubmissionWhereInput = { createdAt: dateRange(query) };
  const q = query.q?.trim();
  if (q) where.OR = [{ content: { contains: q } }, { title: { contains: q } }, { name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }];
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const [total, rows] = await Promise.all([
    prisma.magazineSubmission.count({ where }),
    prisma.magazineSubmission.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * MAGAZINE_PAGE_SIZE, take: MAGAZINE_PAGE_SIZE }),
  ]);
  return {
    posts: rows.map((r) => ({
      id: r.id,
      authorName: r.name,
      authorBatch: r.batch,
      batchTag: null,
      createdAt: r.createdAt.toISOString(),
      editedAt: null,
      content: r.content,
      title: r.title,
      contact: r.phone || r.email,
    })),
    total,
    page,
    pageSize: MAGAZINE_PAGE_SIZE,
  };
}

export const SUBMISSION_MAX = 20_000;
const LIMITS = { name: 120, phone: 40, email: 254, title: 200 };
const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export interface SubmissionInput {
  name?: unknown;
  batch?: unknown;
  phone?: unknown;
  email?: unknown;
  title?: unknown;
  content?: unknown;
}

/**
 * Stores a writing sent through the public form. Needs a name, the text and at
 * least one way to reach the sender (phone or a valid email); the batch is
 * optional because teachers and current students write too.
 */
export async function createMagazineSubmission(input: SubmissionInput) {
  const name = text(input.name, LIMITS.name);
  const phone = text(input.phone, LIMITS.phone);
  const email = text(input.email, LIMITS.email).toLowerCase();
  const title = text(input.title, LIMITS.title);
  const content = typeof input.content === "string" ? input.content.replace(/\r\n?/g, "\n").trim() : "";
  if (!name) throw new AppError("INVALID_SUBMISSION", 400, "আপনার নাম লিখুন।");
  if (!content) throw new AppError("INVALID_SUBMISSION", 400, "আপনার লেখাটি লিখুন।");
  if (content.length > SUBMISSION_MAX) throw new AppError("INVALID_SUBMISSION", 400, `লেখাটি ${SUBMISSION_MAX.toLocaleString("en-US")} অক্ষরের মধ্যে রাখুন।`);
  if (!phone && !email) throw new AppError("INVALID_SUBMISSION", 400, "মোবাইল নম্বর বা ইমেইল দিন, যাতে কমিটি যোগাযোগ করতে পারে।");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError("INVALID_SUBMISSION", 400, "ইমেইল ঠিকানাটি সঠিক নয়।");
  const year = Number(input.batch);
  const batch = Number.isInteger(year) && year >= 1950 && year <= new Date().getFullYear() + 10 ? year : null;
  return prisma.magazineSubmission.create({ data: { name, batch, phone: phone || null, email: email || null, title: title || null, content } });
}
