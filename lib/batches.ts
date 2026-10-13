import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { FIRST_SSC_BATCH, type BatchInfo } from "@/lib/data";

/**
 * SSC batches 1985 to this year. Member counts come from verified profiles; the
 * representative, contact, reunion date and description come from the Batch
 * table, set by admins in /admin/batches. Nothing is invented: a batch without a
 * representative shows none.
 */

export const FIRST_BATCH = FIRST_SSC_BATCH;
const DEFAULT_COVER = "/golden-jubilee-art.jpg";

export function isBatchYear(year: number): boolean {
  return Number.isInteger(year) && year >= FIRST_BATCH && year <= new Date().getFullYear();
}

const dhakaDate = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Dhaka" });

export async function listBatches(): Promise<BatchInfo[]> {
  const thisYear = new Date().getFullYear();
  const [counts, rows] = await Promise.all([
    prisma.alumniProfile.groupBy({
      by: ["sscBatch"],
      _count: { id: true },
      where: { sscBatch: { gte: FIRST_BATCH, lte: thisYear }, verificationStatus: "VERIFIED", user: { disabledAt: null } },
    }),
    prisma.batch.findMany(),
  ]);
  const countByYear = new Map(counts.map((c) => [c.sscBatch, c._count.id]));
  const rowByYear = new Map(rows.map((r) => [r.year, r]));
  const batches: BatchInfo[] = [];
  for (let y = thisYear; y >= FIRST_BATCH; y--) {
    const row = rowByYear.get(y);
    batches.push({
      year: y,
      name: row?.name || `SSC Batch ${y}`,
      tagline: row?.tagline || `Class of ${y}`,
      totalAlumni: countByYear.get(y) ?? 0,
      classRepresentative: row?.classRepresentative || "",
      representativePhone: row?.representativePhone || "",
      reunionDate: row?.reunionDate ? dhakaDate(row.reunionDate) : undefined,
      reunionDateIso: row?.reunionDate ? new Date(row.reunionDate.getTime() + 6 * 3_600_000).toISOString().slice(0, 10) : undefined,
      coverImage: row?.coverImage || DEFAULT_COVER,
      description: row?.description || `Sabuj Shikshayatan Government High School graduates of ${y}.`,
    });
  }
  return batches;
}

export async function getBatch(year: number): Promise<BatchInfo | null> {
  if (!isBatchYear(year)) return null;
  return (await listBatches()).find((b) => b.year === year) ?? null;
}

export interface BatchInput {
  tagline?: unknown;
  description?: unknown;
  classRepresentative?: unknown;
  representativePhone?: unknown;
  reunionDate?: unknown;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Admins set a batch's representative, contact, tagline, description and reunion date. */
export async function updateBatch(year: number, input: BatchInput) {
  if (!isBatchYear(year)) throw new AppError("BATCH_NOT_FOUND", 404, "No such SSC batch.");
  const phone = str(input.representativePhone, 30);
  if (phone && !/^[+\d][\d\s-]{6,}$/.test(phone)) throw new AppError("INVALID_BATCH", 400, "Please enter a valid phone number for the representative.");
  let reunionDate: Date | null = null;
  const rawDate = str(input.reunionDate, 10);
  if (rawDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) throw new AppError("INVALID_BATCH", 400, "Please choose a valid reunion date.");
    reunionDate = new Date(`${rawDate}T12:00:00+06:00`);
  }
  const data = {
    tagline: str(input.tagline, 200) || null,
    description: str(input.description, 2000) || null,
    classRepresentative: str(input.classRepresentative, 120) || null,
    representativePhone: phone || null,
    reunionDate,
  };
  return prisma.batch.upsert({
    where: { year },
    update: data,
    create: { year, name: `SSC Batch ${year}`, ...data },
  });
}
