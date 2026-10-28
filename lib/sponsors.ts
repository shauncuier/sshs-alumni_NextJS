import type { Sponsor, SponsorCategory } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { fieldReader, str } from "@/lib/content-fields";
import { contentImageId, removeContentImage } from "@/lib/media/content-images";
import { SPONSOR_CATEGORIES } from "@/lib/sponsor-categories";

/**
 * The association's supporters on /sponsors, grouped by category and managed in
 * /admin/sponsors. The first published website infrastructure sponsor is also
 * credited in the footer of every page and on the home page.
 */

export interface SponsorView {
  id: string;
  category: SponsorCategory;
  name: string;
  nameEn: string | null;
  address: string | null;
  note: string | null;
  website: string | null;
  logoUrl: string | null;
  isPublished: boolean;
  sortOrder: number;
}

export interface SponsorGroup {
  category: SponsorCategory;
  label: string;
  labelBn: string;
  sponsors: SponsorView[];
}

export interface SponsorInput {
  category?: unknown;
  name?: unknown;
  nameEn?: unknown;
  address?: unknown;
  note?: unknown;
  website?: unknown;
  logoUrl?: unknown;
  isPublished?: unknown;
  sortOrder?: unknown;
}

/** The sponsor the site launched with; added once by the production seed. */
export const DEFAULT_SPONSOR = {
  category: "INFRASTRUCTURE" as const,
  name: "তফজ্জল আহম্মদ স্মৃতি ফাউন্ডেশন",
  nameEn: "Tofazzal Ahmed Smrity Foundation",
  address: "জোড়ামতল, সোনাইছড়ি, সীতাকুণ্ড, চট্টগ্রাম",
  note: "For the welfare of humanity · Est. 2022",
  // Bundled with the site in public/sponsors (made from the foundation's PDF logo).
  logoUrl: "/sponsors/tasf-logo.png",
};

// Logos bundled with the site; everything else must be uploaded through /api/admin/media.
const BUNDLED_LOGO = /^\/sponsors\/[\w.-]+\.(png|webp|jpg|jpeg|svg)$/;

function toView(s: Sponsor): SponsorView {
  return {
    id: s.id,
    category: s.category,
    name: s.name,
    nameEn: s.nameEn,
    address: s.address,
    note: s.note,
    website: s.website,
    logoUrl: s.logoUrl,
    isPublished: s.isPublished,
    sortOrder: s.sortOrder,
  };
}

const ORDER = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

/** Every sponsor in display order (admin), or only the published ones (public pages). */
export async function listSponsors({ publishedOnly = false } = {}): Promise<SponsorView[]> {
  const rows = await prisma.sponsor.findMany({ where: publishedOnly ? { isPublished: true } : undefined, orderBy: ORDER });
  return rows.map(toView);
}

/** Sponsors grouped by category, categories in their fixed order; empty categories are left out. */
export function groupSponsors(sponsors: SponsorView[]): SponsorGroup[] {
  return SPONSOR_CATEGORIES.map((c) => ({ category: c.value, label: c.label, labelBn: c.labelBn, sponsors: sponsors.filter((s) => s.category === c.value) })).filter(
    (g) => g.sponsors.length > 0,
  );
}

/** The website infrastructure sponsor credited in the footer and on the home page, if any. */
export async function getFeaturedSponsor(): Promise<SponsorView | null> {
  const row = await prisma.sponsor.findFirst({ where: { isPublished: true, category: "INFRASTRUCTURE" }, orderBy: ORDER });
  return row ? toView(row) : null;
}

const fields = fieldReader("INVALID_SPONSOR");

function readCategory(v: unknown): SponsorCategory {
  const value = str(v);
  if (!SPONSOR_CATEGORIES.some((c) => c.value === value)) throw fields.bad("Please choose the kind of sponsor.");
  return value as SponsorCategory;
}

function readWebsite(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  if (s.length > 500 || !/^https?:\/\/[^\s/$.?#][^\s]*$/i.test(s)) throw fields.bad("The website must be a full link starting with https://.");
  return s;
}

function readLogo(v: unknown): string | null {
  const url = str(v);
  if (url && !contentImageId(url) && !BUNDLED_LOGO.test(url)) throw fields.bad("Please upload the logo instead of linking to it.");
  return url || null;
}

function validate(input: SponsorInput, partial: boolean) {
  const f = fields;
  const data: Partial<Pick<Sponsor, "category" | "name" | "nameEn" | "address" | "note" | "website" | "logoUrl" | "isPublished" | "sortOrder">> = {};
  if (!partial || input.category !== undefined) data.category = readCategory(input.category);
  if (!partial || input.name !== undefined) data.name = f.text(input.name, "name", 2, 200);
  if (input.nameEn !== undefined) data.nameEn = f.optText(input.nameEn, "English name", 200);
  if (input.address !== undefined) data.address = f.optText(input.address, "address", 300);
  if (input.note !== undefined) data.note = f.optText(input.note, "note", 500);
  if (input.website !== undefined) data.website = readWebsite(input.website);
  if (input.logoUrl !== undefined) data.logoUrl = readLogo(input.logoUrl);
  if (input.isPublished !== undefined) data.isPublished = input.isPublished === true;
  if (input.sortOrder !== undefined) data.sortOrder = f.optInt(input.sortOrder, "order", -1000, 1000) ?? 0;
  return data;
}

export async function createSponsor(input: SponsorInput): Promise<SponsorView> {
  const data = validate(input, false);
  const last = await prisma.sponsor.aggregate({ _max: { sortOrder: true } });
  const row = await prisma.sponsor.create({
    data: {
      category: data.category!,
      name: data.name!,
      nameEn: data.nameEn ?? null,
      address: data.address ?? null,
      note: data.note ?? null,
      website: data.website ?? null,
      logoUrl: data.logoUrl ?? null,
      isPublished: data.isPublished ?? true,
      sortOrder: data.sortOrder ?? (last._max.sortOrder ?? 0) + 1,
    },
  });
  return toView(row);
}

export async function updateSponsor(id: string, input: SponsorInput): Promise<SponsorView> {
  const current = await prisma.sponsor.findUnique({ where: { id } });
  if (!current) throw new AppError("SPONSOR_NOT_FOUND", 404, "Sponsor not found.");
  const data = validate(input, true);
  const row = await prisma.sponsor.update({ where: { id }, data });
  if (data.logoUrl !== undefined && current.logoUrl && current.logoUrl !== row.logoUrl) await removeContentImage(current.logoUrl);
  return toView(row);
}

export async function deleteSponsor(id: string): Promise<SponsorView> {
  const current = await prisma.sponsor.findUnique({ where: { id } });
  if (!current) throw new AppError("SPONSOR_NOT_FOUND", 404, "Sponsor not found.");
  await prisma.sponsor.delete({ where: { id } });
  await removeContentImage(current.logoUrl);
  return toView(current);
}

// Marks that the launch sponsor was added, so removing it later in the admin keeps it removed.
const SEEDED_KEY = "sponsors.defaultSeeded";

/** Adds DEFAULT_SPONSOR once, on a database that never had it. True when it was added. */
export async function seedDefaultSponsor(): Promise<boolean> {
  if (await prisma.setting.findUnique({ where: { key: SEEDED_KEY } })) return false;
  const added = (await prisma.sponsor.count()) === 0;
  if (added) await createSponsor({ ...DEFAULT_SPONSOR, sortOrder: 1 });
  await prisma.setting.create({ data: { key: SEEDED_KEY, value: new Date().toISOString() } });
  return added;
}
