import type { Achievement } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import type { AchievementItem } from "@/lib/data";
import { contentImageId, removeContentImage, thumbUrlFor } from "@/lib/media/content-images";

/**
 * Alumni achievements ("Hall of Distinction"): added and published by admins in
 * /admin/stories, shown on /achievements and the homepage. Photos must be
 * uploaded through /api/admin/media.
 */

export const ACHIEVEMENT_CATEGORIES = [
  "Doctors",
  "Engineers",
  "Entrepreneurs",
  "Researchers",
  "Government Officers",
  "Educators",
  "Artists",
  "Business Leaders",
] as const satisfies readonly AchievementItem["category"][];

export interface AdminAchievement {
  id: string;
  recipientName: string;
  batchYear: number;
  category: string;
  title: string;
  organization: string;
  description: string;
  photoUrl: string | null;
  yearAwarded: number;
  isPublished: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export interface AchievementInput {
  recipientName?: unknown;
  batchYear?: unknown;
  category?: unknown;
  title?: unknown;
  organization?: unknown;
  description?: unknown;
  photoUrl?: unknown;
  yearAwarded?: unknown;
  isPublished?: unknown;
}

const initialsAvatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=06281e&color=fcd34d&bold=true`;

export function toAchievementItem(a: Achievement): AchievementItem {
  return {
    id: a.id,
    recipientName: a.recipientName,
    batchYear: a.batchYear,
    category: (ACHIEVEMENT_CATEGORIES as readonly string[]).includes(a.category) ? (a.category as AchievementItem["category"]) : "Entrepreneurs",
    title: a.title,
    organization: a.organization,
    description: a.description,
    photoUrl: (a.photoUrl ? thumbUrlFor(a.photoUrl) : null) || initialsAvatar(a.recipientName),
    yearAwarded: a.yearAwarded,
  };
}

function toAdmin(a: Achievement): AdminAchievement {
  return {
    id: a.id,
    recipientName: a.recipientName,
    batchYear: a.batchYear,
    category: a.category,
    title: a.title,
    organization: a.organization,
    description: a.description,
    photoUrl: a.photoUrl,
    yearAwarded: a.yearAwarded,
    isPublished: a.isPublished,
    updatedAt: a.updatedAt.toISOString(),
    updatedBy: a.updatedBy,
  };
}

export async function listPublishedAchievements(limit = 200): Promise<AchievementItem[]> {
  const rows = await prisma.achievement.findMany({ where: { isPublished: true }, orderBy: [{ yearAwarded: "desc" }, { createdAt: "desc" }], take: limit });
  return rows.map(toAchievementItem);
}

export async function listAchievementsForAdmin(): Promise<AdminAchievement[]> {
  const rows = await prisma.achievement.findMany({ orderBy: [{ isPublished: "asc" }, { updatedAt: "desc" }] });
  return rows.map(toAdmin);
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const bad = (message: string) => new AppError("INVALID_ACHIEVEMENT", 400, message);
const thisYear = () => new Date().getFullYear();

function validate(input: AchievementInput, partial: boolean) {
  const data: Partial<Omit<Achievement, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">> = {};
  const text = (key: "recipientName" | "title" | "organization" | "description", min: number, max: number, name: string) => {
    if (partial && input[key] === undefined) return;
    const value = str(input[key]);
    if (value.length < min || value.length > max) throw bad(`${name} must be ${min} to ${max} characters.`);
    data[key] = value;
  };
  text("recipientName", 2, 120, "The name");
  text("title", 3, 200, "The award or achievement");
  text("organization", 2, 200, "The awarding organization");
  text("description", 10, 3000, "The description");
  if (!partial || input.category !== undefined) {
    if (!(ACHIEVEMENT_CATEGORIES as readonly string[]).includes(input.category as string)) throw bad("Please choose a category.");
    data.category = input.category as string;
  }
  if (!partial || input.batchYear !== undefined) {
    const batch = Number(input.batchYear);
    if (!Number.isInteger(batch) || batch < 1950 || batch > thisYear()) throw bad("Please enter the SSC batch year.");
    data.batchYear = batch;
  }
  if (!partial || input.yearAwarded !== undefined) {
    const year = Number(input.yearAwarded);
    if (!Number.isInteger(year) || year < 1950 || year > thisYear()) throw bad("Please enter the year of the achievement.");
    data.yearAwarded = year;
  }
  if (input.photoUrl !== undefined) {
    const url = str(input.photoUrl);
    if (url && !contentImageId(url)) throw bad("Please upload the photo instead of linking to it.");
    data.photoUrl = url || null;
  }
  if (input.isPublished !== undefined) data.isPublished = input.isPublished === true;
  return data;
}

export async function createAchievement(input: AchievementInput, adminEmail: string): Promise<AdminAchievement> {
  const data = validate(input, false);
  const row = await prisma.achievement.create({
    data: {
      recipientName: data.recipientName!,
      batchYear: data.batchYear!,
      category: data.category!,
      title: data.title!,
      organization: data.organization!,
      description: data.description!,
      yearAwarded: data.yearAwarded!,
      photoUrl: data.photoUrl ?? null,
      isPublished: data.isPublished ?? false,
      createdBy: adminEmail,
      updatedBy: adminEmail,
    },
  });
  return toAdmin(row);
}

export async function updateAchievement(id: string, input: AchievementInput, adminEmail: string): Promise<{ item: AdminAchievement; published: boolean }> {
  const current = await prisma.achievement.findUnique({ where: { id } });
  if (!current) throw new AppError("ACHIEVEMENT_NOT_FOUND", 404, "Achievement not found.");
  const data = validate(input, true);
  const row = await prisma.achievement.update({ where: { id }, data: { ...data, updatedBy: adminEmail } });
  if (data.photoUrl !== undefined && current.photoUrl && current.photoUrl !== row.photoUrl) await removeContentImage(current.photoUrl);
  return { item: toAdmin(row), published: data.isPublished === true && !current.isPublished };
}

export async function deleteAchievement(id: string): Promise<AdminAchievement> {
  const current = await prisma.achievement.findUnique({ where: { id } });
  if (!current) throw new AppError("ACHIEVEMENT_NOT_FOUND", 404, "Achievement not found.");
  await prisma.achievement.delete({ where: { id } });
  await removeContentImage(current.photoUrl);
  return toAdmin(current);
}
