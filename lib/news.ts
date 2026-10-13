import type { NewsArticle } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import type { NewsItem } from "@/lib/data";
import { contentImageId, removeContentImage, thumbUrlFor } from "@/lib/media/content-images";

/**
 * News articles: written and published by admins in /admin/news, shown on /news.
 * Content is plain text (blank lines separate paragraphs) and is never rendered
 * as HTML; images must be ones uploaded through /api/admin/media.
 */

export const NEWS_CATEGORIES = ["School News", "Alumni News", "Events", "Announcements"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
const FALLBACK_IMAGE = "/golden-jubilee-art.jpg";

export interface AdminNewsItem {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  featuredImage: string | null;
  author: string;
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface NewsInput {
  title?: unknown;
  category?: unknown;
  excerpt?: unknown;
  content?: unknown;
  featuredImage?: unknown;
  author?: unknown;
  isPublished?: unknown;
  isFeatured?: unknown;
}

const formatDate = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit", timeZone: "Asia/Dhaka" });

export function toNewsItem(a: NewsArticle, size: "thumb" | "large" = "thumb"): NewsItem {
  const image = a.featuredImage ? (size === "thumb" ? thumbUrlFor(a.featuredImage) : a.featuredImage) : null;
  return {
    id: a.id,
    title: a.title,
    category: (NEWS_CATEGORIES as readonly string[]).includes(a.category) ? (a.category as NewsCategory) : "Announcements",
    excerpt: a.excerpt,
    content: a.content,
    featuredImage: image || FALLBACK_IMAGE,
    date: formatDate(a.publishedAt),
    publishedAt: a.publishedAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    author: a.author,
  };
}

function toAdminItem(a: NewsArticle): AdminNewsItem {
  return {
    id: a.id,
    title: a.title,
    category: a.category,
    excerpt: a.excerpt,
    content: a.content,
    featuredImage: a.featuredImage,
    author: a.author,
    isPublished: a.isPublished,
    isFeatured: a.isFeatured,
    publishedAt: a.publishedAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    updatedBy: a.updatedBy,
  };
}

export async function listPublishedNews(limit = 60): Promise<NewsItem[]> {
  const rows = await prisma.newsArticle.findMany({
    where: { isPublished: true },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take: limit,
  });
  return rows.map((r) => toNewsItem(r));
}

export async function getPublishedNews(id: string): Promise<NewsItem | null> {
  const row = await prisma.newsArticle.findFirst({ where: { id, isPublished: true } });
  return row ? toNewsItem(row, "large") : null;
}

export async function listAllNews(): Promise<AdminNewsItem[]> {
  const rows = await prisma.newsArticle.findMany({ orderBy: [{ isPublished: "asc" }, { updatedAt: "desc" }] });
  return rows.map(toAdminItem);
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function validate(input: NewsInput, partial: boolean) {
  const data: Partial<Pick<NewsArticle, "title" | "category" | "excerpt" | "content" | "featuredImage" | "author" | "isPublished" | "isFeatured">> = {};
  const bad = (message: string) => new AppError("INVALID_NEWS", 400, message);

  if (!partial || input.title !== undefined) {
    const title = str(input.title);
    if (title.length < 3 || title.length > 200) throw bad("The title must be 3 to 200 characters.");
    data.title = title;
  }
  if (!partial || input.category !== undefined) {
    if (!(NEWS_CATEGORIES as readonly string[]).includes(input.category as string)) throw bad("Please choose a category.");
    data.category = input.category as string;
  }
  if (!partial || input.content !== undefined) {
    const content = str(input.content).replace(/\r\n/g, "\n");
    if (content.length < 20) throw bad("Please write at least a few sentences.");
    if (content.length > 100_000) throw bad("The article is too long.");
    data.content = content;
  }
  if (!partial || input.excerpt !== undefined) {
    let excerpt = str(input.excerpt);
    if (!excerpt && data.content) excerpt = data.content.split(/\n\s*\n/)[0].slice(0, 280);
    if (!excerpt) throw bad("Please write a short summary.");
    if (excerpt.length > 400) throw bad("Keep the summary to 400 characters or fewer.");
    data.excerpt = excerpt;
  }
  if (input.featuredImage !== undefined) {
    const url = str(input.featuredImage);
    // Only images uploaded through the admin panel: no hotlinked or script URLs.
    if (url && !contentImageId(url)) throw bad("Please upload the image instead of linking to it.");
    data.featuredImage = url || null;
  }
  if (!partial || input.author !== undefined) {
    const author = str(input.author) || "SSGHS Alumni Association";
    if (author.length > 120) throw bad("The author name is too long.");
    data.author = author;
  }
  if (input.isPublished !== undefined) data.isPublished = input.isPublished === true;
  if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured === true;
  return data;
}

export async function createNews(input: NewsInput, adminEmail: string): Promise<AdminNewsItem> {
  const data = validate(input, false);
  const row = await prisma.newsArticle.create({
    data: {
      title: data.title!,
      category: data.category!,
      excerpt: data.excerpt!,
      content: data.content!,
      author: data.author!,
      featuredImage: data.featuredImage ?? null,
      isPublished: data.isPublished ?? false,
      isFeatured: data.isFeatured ?? false,
      publishedAt: new Date(),
      createdBy: adminEmail,
      updatedBy: adminEmail,
    },
  });
  return toAdminItem(row);
}

export async function updateNews(id: string, input: NewsInput, adminEmail: string): Promise<{ item: AdminNewsItem; published: boolean }> {
  const current = await prisma.newsArticle.findUnique({ where: { id } });
  if (!current) throw new AppError("NEWS_NOT_FOUND", 404, "Article not found.");
  const data = validate(input, true);
  // The public date is the moment the article first goes live.
  const published = data.isPublished === true && !current.isPublished;
  const row = await prisma.newsArticle.update({
    where: { id },
    data: { ...data, ...(published ? { publishedAt: new Date() } : {}), updatedBy: adminEmail },
  });
  if (data.featuredImage !== undefined && current.featuredImage && current.featuredImage !== row.featuredImage) {
    await removeContentImage(current.featuredImage);
  }
  return { item: toAdminItem(row), published };
}

export async function deleteNews(id: string): Promise<AdminNewsItem> {
  const current = await prisma.newsArticle.findUnique({ where: { id } });
  if (!current) throw new AppError("NEWS_NOT_FOUND", 404, "Article not found.");
  await prisma.newsArticle.delete({ where: { id } });
  await removeContentImage(current.featuredImage);
  return toAdminItem(current);
}
