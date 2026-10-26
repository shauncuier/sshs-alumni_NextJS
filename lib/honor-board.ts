import type { HonorBoardEntry } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { fieldReader } from "@/lib/content-fields";
import { removeContentImage } from "@/lib/media/content-images";

/**
 * The honor board on /honor-board: names grouped under an honour (e.g. "Past
 * presidents", "Founding members"), managed in /admin/honor-board.
 */

export interface HonorEntryView {
  id: string;
  honour: string;
  name: string;
  period: string | null;
  sscBatch: number | null;
  photoUrl: string | null;
  note: string | null;
  sortOrder: number;
}

export interface HonorGroup {
  honour: string;
  entries: HonorEntryView[];
}

export interface HonorInput {
  honour?: unknown;
  name?: unknown;
  period?: unknown;
  sscBatch?: unknown;
  photoUrl?: unknown;
  note?: unknown;
  sortOrder?: unknown;
}

function toView(e: HonorBoardEntry): HonorEntryView {
  return { id: e.id, honour: e.honour, name: e.name, period: e.period, sscBatch: e.sscBatch, photoUrl: e.photoUrl, note: e.note, sortOrder: e.sortOrder };
}

export async function listHonorEntries(): Promise<HonorEntryView[]> {
  const rows = await prisma.honorBoardEntry.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return rows.map(toView);
}

/** Entries grouped by honour; a group sits where its first entry does in the overall order. */
export function groupHonorEntries(entries: HonorEntryView[]): HonorGroup[] {
  const groups = new Map<string, HonorEntryView[]>();
  for (const e of entries) {
    const list = groups.get(e.honour);
    if (list) list.push(e);
    else groups.set(e.honour, [e]);
  }
  return [...groups].map(([honour, list]) => ({ honour, entries: list }));
}

const fields = fieldReader("INVALID_HONOR_ENTRY");

function validate(input: HonorInput, partial: boolean) {
  const f = fields;
  const data: Partial<Pick<HonorBoardEntry, "honour" | "name" | "period" | "sscBatch" | "photoUrl" | "note" | "sortOrder">> = {};
  if (!partial || input.honour !== undefined) data.honour = f.text(input.honour, "honour", 2, 200);
  if (!partial || input.name !== undefined) data.name = f.text(input.name, "name", 2, 200);
  if (input.period !== undefined) data.period = f.optText(input.period, "period", 100);
  if (input.sscBatch !== undefined) data.sscBatch = f.optInt(input.sscBatch, "SSC batch", 1950, new Date().getFullYear() + 1);
  if (input.photoUrl !== undefined) data.photoUrl = f.optImage(input.photoUrl);
  if (input.note !== undefined) data.note = f.optText(input.note, "note", 300);
  if (input.sortOrder !== undefined) data.sortOrder = f.optInt(input.sortOrder, "order", -1000, 1000) ?? 0;
  return data;
}

export async function createHonorEntry(input: HonorInput): Promise<HonorEntryView> {
  const data = validate(input, false);
  const last = await prisma.honorBoardEntry.aggregate({ _max: { sortOrder: true } });
  const row = await prisma.honorBoardEntry.create({
    data: {
      honour: data.honour!,
      name: data.name!,
      period: data.period ?? null,
      sscBatch: data.sscBatch ?? null,
      photoUrl: data.photoUrl ?? null,
      note: data.note ?? null,
      sortOrder: data.sortOrder ?? (last._max.sortOrder ?? 0) + 1,
    },
  });
  return toView(row);
}

export async function updateHonorEntry(id: string, input: HonorInput): Promise<HonorEntryView> {
  const current = await prisma.honorBoardEntry.findUnique({ where: { id } });
  if (!current) throw new AppError("HONOR_ENTRY_NOT_FOUND", 404, "Honor board entry not found.");
  const data = validate(input, true);
  const row = await prisma.honorBoardEntry.update({ where: { id }, data });
  if (data.photoUrl !== undefined && current.photoUrl && current.photoUrl !== row.photoUrl) await removeContentImage(current.photoUrl);
  return toView(row);
}

export async function deleteHonorEntry(id: string): Promise<HonorEntryView> {
  const current = await prisma.honorBoardEntry.findUnique({ where: { id } });
  if (!current) throw new AppError("HONOR_ENTRY_NOT_FOUND", 404, "Honor board entry not found.");
  await prisma.honorBoardEntry.delete({ where: { id } });
  await removeContentImage(current.photoUrl);
  return toView(current);
}
