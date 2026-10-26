import type { ConstitutionDocument } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { fieldReader } from "@/lib/content-fields";
import { removeDocument } from "@/lib/media/documents";

/**
 * Versions of the association's constitution on /constitution, each a PDF uploaded
 * in /admin/constitution. Newest first.
 */

export interface ConstitutionView {
  id: string;
  title: string;
  year: number;
  summary: string | null;
  fileUrl: string;
  sortOrder: number;
}

export interface ConstitutionInput {
  title?: unknown;
  year?: unknown;
  summary?: unknown;
  fileUrl?: unknown;
  sortOrder?: unknown;
}

function toView(d: ConstitutionDocument): ConstitutionView {
  return { id: d.id, title: d.title, year: d.year, summary: d.summary, fileUrl: d.fileUrl, sortOrder: d.sortOrder };
}

export async function listConstitutions(): Promise<ConstitutionView[]> {
  const rows = await prisma.constitutionDocument.findMany({ orderBy: [{ year: "desc" }, { sortOrder: "asc" }] });
  return rows.map(toView);
}

const fields = fieldReader("INVALID_CONSTITUTION");

function validate(input: ConstitutionInput, partial: boolean) {
  const f = fields;
  const data: Partial<Pick<ConstitutionDocument, "title" | "year" | "summary" | "fileUrl" | "sortOrder">> = {};
  if (!partial || input.title !== undefined) data.title = f.text(input.title, "title", 3, 200);
  if (!partial || input.year !== undefined) data.year = f.int(input.year, "year", 1950, new Date().getFullYear() + 1);
  if (input.summary !== undefined) data.summary = f.optText(input.summary, "summary", 2000);
  if (!partial || input.fileUrl !== undefined) {
    const url = f.optDocument(input.fileUrl);
    if (!url) throw f.bad("Please upload the constitution PDF.");
    data.fileUrl = url;
  }
  if (input.sortOrder !== undefined) data.sortOrder = f.optInt(input.sortOrder, "order", -1000, 1000) ?? 0;
  return data;
}

export async function createConstitution(input: ConstitutionInput): Promise<ConstitutionView> {
  const data = validate(input, false);
  const row = await prisma.constitutionDocument.create({
    data: { title: data.title!, year: data.year!, summary: data.summary ?? null, fileUrl: data.fileUrl!, sortOrder: data.sortOrder ?? 0 },
  });
  return toView(row);
}

export async function updateConstitution(id: string, input: ConstitutionInput): Promise<ConstitutionView> {
  const current = await prisma.constitutionDocument.findUnique({ where: { id } });
  if (!current) throw new AppError("CONSTITUTION_NOT_FOUND", 404, "Document not found.");
  const data = validate(input, true);
  const row = await prisma.constitutionDocument.update({ where: { id }, data });
  if (data.fileUrl !== undefined && current.fileUrl !== row.fileUrl) await removeDocument(current.fileUrl);
  return toView(row);
}

export async function deleteConstitution(id: string): Promise<ConstitutionView> {
  const current = await prisma.constitutionDocument.findUnique({ where: { id } });
  if (!current) throw new AppError("CONSTITUTION_NOT_FOUND", 404, "Document not found.");
  await prisma.constitutionDocument.delete({ where: { id } });
  await removeDocument(current.fileUrl);
  return toView(current);
}
