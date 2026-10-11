import type { AlumniStory } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import type { AlumniStoryItem } from "@/lib/data";
import { contentImageId, removeContentImage, thumbUrlFor } from "@/lib/media/content-images";

/**
 * Alumni stories: written and published by admins in /admin/stories, shown on
 * /stories, /stories/[id] and the homepage. The story text is plain text (blank
 * lines separate paragraphs) and is never rendered as HTML; cover images must be
 * uploaded through /api/admin/media.
 */

const FALLBACK_COVER = "/golden-jubilee.jpg";
const WORDS_PER_MINUTE = 200;

export interface AdminStory {
  id: string;
  title: string;
  authorName: string;
  batchYear: number;
  profession: string;
  currentOrganization: string | null;
  coverImage: string | null;
  summary: string;
  fullStory: string;
  quote: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface StoryInput {
  title?: unknown;
  authorName?: unknown;
  batchYear?: unknown;
  profession?: unknown;
  currentOrganization?: unknown;
  coverImage?: unknown;
  summary?: unknown;
  fullStory?: unknown;
  quote?: unknown;
  isPublished?: unknown;
  isFeatured?: unknown;
}

export function readTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min read`;
}

export function toStoryItem(s: AlumniStory, size: "thumb" | "large" = "thumb"): AlumniStoryItem {
  const cover = s.coverImage ? (size === "thumb" ? thumbUrlFor(s.coverImage) : s.coverImage) : null;
  return {
    id: s.id,
    title: s.title,
    authorName: s.authorName,
    batchYear: s.batchYear,
    profession: s.profession,
    currentOrganization: s.currentOrganization ?? "",
    coverImage: cover || FALLBACK_COVER,
    summary: s.summary,
    fullStory: s.fullStory,
    quote: s.quote ?? "",
    publishedDate: s.publishedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit", timeZone: "Asia/Dhaka" }),
    readTime: readTime(`${s.summary} ${s.fullStory}`),
  };
}

function toAdmin(s: AlumniStory): AdminStory {
  return {
    id: s.id,
    title: s.title,
    authorName: s.authorName,
    batchYear: s.batchYear,
    profession: s.profession,
    currentOrganization: s.currentOrganization,
    coverImage: s.coverImage,
    summary: s.summary,
    fullStory: s.fullStory,
    quote: s.quote,
    isPublished: s.isPublished,
    isFeatured: s.isFeatured,
    publishedAt: s.publishedAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    updatedBy: s.updatedBy,
  };
}

export async function listPublishedStories(limit = 60): Promise<AlumniStoryItem[]> {
  const rows = await prisma.alumniStory.findMany({ where: { isPublished: true }, orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }], take: limit });
  return rows.map((r) => toStoryItem(r));
}

export async function getPublishedStory(id: string): Promise<AlumniStoryItem | null> {
  const row = await prisma.alumniStory.findFirst({ where: { id, isPublished: true } });
  return row ? toStoryItem(row, "large") : null;
}

/** Ids and dates of published stories, for the sitemap. */
export async function publishedStoryIds(): Promise<{ id: string; updatedAt: Date }[]> {
  return prisma.alumniStory.findMany({ where: { isPublished: true }, select: { id: true, updatedAt: true } });
}

export async function listStoriesForAdmin(): Promise<AdminStory[]> {
  const rows = await prisma.alumniStory.findMany({ orderBy: [{ isPublished: "asc" }, { updatedAt: "desc" }] });
  return rows.map(toAdmin);
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const bad = (message: string) => new AppError("INVALID_STORY", 400, message);

function validate(input: StoryInput, partial: boolean) {
  const data: Partial<Omit<AlumniStory, "id" | "publishedAt" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">> = {};
  const required = (key: "title" | "authorName" | "profession", min: number, max: number, name: string) => {
    if (partial && input[key] === undefined) return;
    const value = str(input[key]);
    if (value.length < min || value.length > max) throw bad(`${name} must be ${min} to ${max} characters.`);
    data[key] = value;
  };
  required("title", 3, 200, "The title");
  required("authorName", 2, 120, "The alumnus's name");
  required("profession", 2, 120, "The profession");
  if (!partial || input.batchYear !== undefined) {
    const batch = Number(input.batchYear);
    if (!Number.isInteger(batch) || batch < 1950 || batch > new Date().getFullYear()) throw bad("Please enter the SSC batch year.");
    data.batchYear = batch;
  }
  if (!partial || input.fullStory !== undefined) {
    const story = str(input.fullStory).replace(/\r\n/g, "\n");
    if (story.length < 50) throw bad("Please write the story (at least a few sentences).");
    if (story.length > 100_000) throw bad("The story is too long.");
    data.fullStory = story;
  }
  if (!partial || input.summary !== undefined) {
    let summary = str(input.summary);
    if (!summary && data.fullStory) summary = data.fullStory.split(/\n\s*\n/)[0].slice(0, 280);
    if (!summary || summary.length > 500) throw bad("Please write a summary of up to 500 characters.");
    data.summary = summary;
  }
  if (input.currentOrganization !== undefined) data.currentOrganization = str(input.currentOrganization).slice(0, 200) || null;
  if (input.quote !== undefined) {
    const quote = str(input.quote);
    if (quote.length > 500) throw bad("Keep the quote to 500 characters or fewer.");
    data.quote = quote || null;
  }
  if (input.coverImage !== undefined) {
    const url = str(input.coverImage);
    if (url && !contentImageId(url)) throw bad("Please upload the cover image instead of linking to it.");
    data.coverImage = url || null;
  }
  if (input.isPublished !== undefined) data.isPublished = input.isPublished === true;
  if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured === true;
  return data;
}

export async function createStory(input: StoryInput, adminEmail: string): Promise<AdminStory> {
  const data = validate(input, false);
  const row = await prisma.alumniStory.create({
    data: {
      title: data.title!,
      authorName: data.authorName!,
      batchYear: data.batchYear!,
      profession: data.profession!,
      summary: data.summary!,
      fullStory: data.fullStory!,
      currentOrganization: data.currentOrganization ?? null,
      quote: data.quote ?? null,
      coverImage: data.coverImage ?? null,
      isPublished: data.isPublished ?? false,
      isFeatured: data.isFeatured ?? false,
      publishedAt: new Date(),
      createdBy: adminEmail,
      updatedBy: adminEmail,
    },
  });
  return toAdmin(row);
}

export async function updateStory(id: string, input: StoryInput, adminEmail: string): Promise<{ item: AdminStory; published: boolean }> {
  const current = await prisma.alumniStory.findUnique({ where: { id } });
  if (!current) throw new AppError("STORY_NOT_FOUND", 404, "Story not found.");
  const data = validate(input, true);
  const published = data.isPublished === true && !current.isPublished;
  const row = await prisma.alumniStory.update({ where: { id }, data: { ...data, ...(published ? { publishedAt: new Date() } : {}), updatedBy: adminEmail } });
  if (data.coverImage !== undefined && current.coverImage && current.coverImage !== row.coverImage) await removeContentImage(current.coverImage);
  return { item: toAdmin(row), published };
}

export async function deleteStory(id: string): Promise<AdminStory> {
  const current = await prisma.alumniStory.findUnique({ where: { id } });
  if (!current) throw new AppError("STORY_NOT_FOUND", 404, "Story not found.");
  await prisma.alumniStory.delete({ where: { id } });
  await removeContentImage(current.coverImage);
  return toAdmin(current);
}
