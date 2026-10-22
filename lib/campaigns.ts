import crypto from "node:crypto";
import type { CampaignCategory, DonationCampaign } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import type { DonationCampaignItem } from "@/lib/data";
import { contentImageId, removeContentImage } from "@/lib/media/content-images";

/**
 * Fundraising campaigns, created and edited by admins in /admin/donations. Members
 * donate only to open campaigns: active (not closed by an admin), started, and not
 * past their end date. A campaign that has received donations cannot be deleted,
 * only closed, so the donation records keep their campaign.
 */

export const CATEGORY_LABELS: Record<CampaignCategory, DonationCampaignItem["category"]> = {
  SCHOLARSHIP: "Scholarship",
  STEM_LAB: "STEM Lab",
  LIBRARY: "Library",
  EMERGENCY_AID: "Emergency Aid",
  CAMPUS_DEV: "Campus Development",
  REUNION: "Reunion",
  SPORTS: "Sports",
  CULTURAL: "Cultural Program",
};
export const CAMPAIGN_CATEGORIES = Object.keys(CATEGORY_LABELS) as CampaignCategory[];
export const MAX_GOAL = 1_000_000_000;

export type CampaignStatus = "OPEN" | "CLOSED" | "ENDED" | "UPCOMING";

export interface AdminCampaign {
  id: string;
  title: string;
  category: CampaignCategory;
  categoryLabel: string;
  description: string;
  goalAmount: number;
  raisedAmount: number;
  donorCount: number;
  bannerImage: string | null;
  isActive: boolean;
  status: CampaignStatus;
  startDate: string;
  endDate: string | null;
  daysLeft: number | null;
  donationsCount: number;
  createdAt: string;
}

export interface CampaignInput {
  title?: unknown;
  category?: unknown;
  description?: unknown;
  goalAmount?: unknown;
  bannerImage?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  isActive?: unknown;
}

const DAY = 86_400_000;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bad = (message: string) => new AppError("INVALID_CAMPAIGN", 400, message);
/** YYYY-MM-DD in Dhaka time. */
const dhakaDay = (d: Date) => new Date(d.getTime() + 6 * 3_600_000).toISOString().slice(0, 10);

export function campaignStatus(c: Pick<DonationCampaign, "isActive" | "startDate" | "endDate">, now = new Date()): CampaignStatus {
  if (!c.isActive) return "CLOSED";
  if (c.endDate && c.endDate.getTime() < now.getTime()) return "ENDED";
  if (c.startDate.getTime() > now.getTime()) return "UPCOMING";
  return "OPEN";
}

const daysLeft = (c: Pick<DonationCampaign, "endDate">, now = new Date()) =>
  c.endDate ? Math.max(0, Math.ceil((c.endDate.getTime() - now.getTime()) / DAY)) : null;

function toPublicItem(c: DonationCampaign): DonationCampaignItem {
  return {
    id: c.id,
    title: c.title,
    category: CATEGORY_LABELS[c.category],
    description: c.description,
    goalAmount: c.goalAmount,
    raisedAmount: c.raisedAmount,
    donorCount: c.donorCount,
    bannerImage: c.bannerImage ?? "",
    daysLeft: daysLeft(c),
    featured: false,
  };
}

function toAdmin(c: DonationCampaign & { _count: { donations: number } }): AdminCampaign {
  return {
    id: c.id,
    title: c.title,
    category: c.category,
    categoryLabel: CATEGORY_LABELS[c.category],
    description: c.description,
    goalAmount: c.goalAmount,
    raisedAmount: c.raisedAmount,
    donorCount: c.donorCount,
    bannerImage: c.bannerImage,
    isActive: c.isActive,
    status: campaignStatus(c),
    startDate: dhakaDay(c.startDate),
    endDate: c.endDate ? dhakaDay(c.endDate) : null,
    daysLeft: daysLeft(c),
    donationsCount: c._count.donations,
    createdAt: c.createdAt.toISOString(),
  };
}

/** Campaigns members can donate to, newest first. */
export async function listOpenCampaigns(limit?: number): Promise<DonationCampaignItem[]> {
  const now = new Date();
  const rows = await prisma.donationCampaign.findMany({
    where: { isActive: true, startDate: { lte: now }, OR: [{ endDate: null }, { endDate: { gte: now } }] },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toPublicItem);
}

/** An open campaign, or a 404 AppError members can read. */
export async function openCampaignOrThrow(id: unknown): Promise<DonationCampaign> {
  const campaign = typeof id === "string" && id ? await prisma.donationCampaign.findUnique({ where: { id } }) : null;
  if (!campaign || campaignStatus(campaign) !== "OPEN") {
    throw new AppError("CAMPAIGN_NOT_FOUND", 404, "That fundraising campaign is not open for donations.");
  }
  return campaign;
}

export async function listAdminCampaigns(): Promise<AdminCampaign[]> {
  const rows = await prisma.donationCampaign.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { donations: true } } } });
  return rows.map(toAdmin);
}

function parseDay(value: unknown, label: string): string | null {
  const raw = str(value, 10);
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw))) throw bad(`Please choose a valid ${label}.`);
  return raw;
}

type CampaignData = Partial<Pick<DonationCampaign, "title" | "category" | "description" | "goalAmount" | "bannerImage" | "startDate" | "endDate" | "isActive">>;

function validate(input: CampaignInput, partial: boolean, current?: DonationCampaign): CampaignData {
  const data: CampaignData = {};
  const has = (k: keyof CampaignInput) => !partial || input[k] !== undefined;

  if (has("title")) {
    const title = str(input.title, 150);
    if (title.length < 3) throw bad("Please give the campaign a title (at least 3 characters).");
    data.title = title;
  }
  if (has("category")) {
    if (!CAMPAIGN_CATEGORIES.includes(input.category as CampaignCategory)) throw bad("Please choose a category.");
    data.category = input.category as CampaignCategory;
  }
  if (has("description")) {
    const description = str(input.description, 5000);
    if (description.length < 10) throw bad("Please describe what the money is for (at least 10 characters).");
    data.description = description;
  }
  if (has("goalAmount")) {
    const goal = Number(input.goalAmount);
    if (!Number.isFinite(goal) || goal < 1 || goal > MAX_GOAL) throw bad("Please enter a goal amount in taka.");
    data.goalAmount = Math.round(goal);
  }
  if (input.bannerImage !== undefined) {
    const url = str(input.bannerImage, 500);
    // Only images uploaded through the admin panel: no hotlinked or script URLs.
    if (url && url !== current?.bannerImage && !contentImageId(url)) throw bad("Please upload the banner image instead of linking to it.");
    data.bannerImage = url || null;
  }
  if (has("startDate")) {
    const day = parseDay(input.startDate, "start date");
    data.startDate = day ? new Date(`${day}T00:00:00+06:00`) : partial ? undefined : new Date();
  }
  if (input.endDate !== undefined) {
    const day = parseDay(input.endDate, "end date");
    data.endDate = day ? new Date(`${day}T23:59:59+06:00`) : null;
  }
  if (input.isActive !== undefined) data.isActive = input.isActive === true;

  const start = data.startDate ?? current?.startDate ?? new Date();
  const end = data.endDate !== undefined ? data.endDate : current?.endDate;
  if (end && end.getTime() < start.getTime()) throw bad("The end date must be after the start date.");
  return data;
}

async function uniqueSlug(title: string): Promise<string> {
  const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "campaign";
  const taken = await prisma.donationCampaign.findUnique({ where: { slug: base }, select: { id: true } });
  return taken ? `${base}-${crypto.randomBytes(3).toString("hex")}` : base;
}

const withCount = { _count: { select: { donations: true } } } as const;

export async function createCampaign(input: CampaignInput): Promise<AdminCampaign> {
  const data = validate(input, false);
  const row = await prisma.donationCampaign.create({
    data: {
      title: data.title!,
      category: data.category!,
      description: data.description!,
      goalAmount: data.goalAmount!,
      bannerImage: data.bannerImage ?? null,
      startDate: data.startDate ?? new Date(),
      endDate: data.endDate ?? null,
      isActive: data.isActive ?? true,
      slug: await uniqueSlug(data.title!),
    },
    include: withCount,
  });
  return toAdmin(row);
}

export async function updateCampaign(id: string, input: CampaignInput): Promise<{ before: AdminCampaign; after: AdminCampaign }> {
  const current = await prisma.donationCampaign.findUnique({ where: { id }, include: withCount });
  if (!current) throw new AppError("CAMPAIGN_NOT_FOUND", 404, "Campaign not found.");
  const data = validate(input, true, current);
  const row = await prisma.donationCampaign.update({ where: { id }, data, include: withCount });
  if (data.bannerImage !== undefined && current.bannerImage && current.bannerImage !== row.bannerImage) {
    await removeContentImage(current.bannerImage);
  }
  return { before: toAdmin(current), after: toAdmin(row) };
}

/** Deletes a campaign nobody has donated to; one with donations can only be closed. */
export async function deleteCampaign(id: string): Promise<AdminCampaign> {
  const current = await prisma.donationCampaign.findUnique({ where: { id }, include: withCount });
  if (!current) throw new AppError("CAMPAIGN_NOT_FOUND", 404, "Campaign not found.");
  if (current._count.donations > 0) {
    throw new AppError("CAMPAIGN_HAS_DONATIONS", 409, "This campaign has donations, so it cannot be deleted. Close it instead.");
  }
  await prisma.donationCampaign.delete({ where: { id } });
  await removeContentImage(current.bannerImage);
  return toAdmin(current);
}
