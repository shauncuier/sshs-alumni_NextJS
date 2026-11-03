import type { SchoolPerson, SchoolPersonKind, SchoolPersonStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { fieldReader, str } from "@/lib/content-fields";
import { contentImageId, removeContentImage } from "@/lib/media/content-images";
import { FIRST_SCHOOL_PEOPLE } from "@/lib/teachers-seed";
import { isShown, PERSON_KINDS, PERSON_STATUSES, type SchoolPersonView } from "@/lib/teachers-shared";

export { isShown, PERSON_KINDS, PERSON_STATUSES, type SchoolPersonView };

/**
 * The school's founders, head teachers, teachers and office staff: the "With gratitude"
 * panel on the home page and the people on /school, managed in /admin/teachers.
 * Someone whose status is still unknown stays off the public pages (founders excepted).
 */

export interface SchoolPersonInput {
  kind?: unknown;
  status?: unknown;
  nameBn?: unknown;
  nameEn?: unknown;
  roleBn?: unknown;
  roleEn?: unknown;
  tenure?: unknown;
  photoUrl?: unknown;
  note?: unknown;
  onHomePage?: unknown;
  isPublished?: unknown;
  sortOrder?: unknown;
}

// Photos bundled with the site (cropped from the 2015 souvenir); new ones are uploaded through /api/admin/media.
const BUNDLED_PHOTO = /^\/teachers\/[\w.-]+\.(jpg|jpeg|png|webp)$/;

function toView(p: SchoolPerson): SchoolPersonView {
  return {
    id: p.id,
    kind: p.kind,
    status: p.status,
    nameBn: p.nameBn,
    nameEn: p.nameEn,
    roleBn: p.roleBn,
    roleEn: p.roleEn,
    tenure: p.tenure,
    photoUrl: p.photoUrl,
    note: p.note,
    onHomePage: p.onHomePage,
    isPublished: p.isPublished,
    sortOrder: p.sortOrder,
  };
}

const KIND_ORDER: SchoolPersonKind[] = PERSON_KINDS.map((k) => k.value);
const byKindThenOrder = (a: SchoolPersonView, b: SchoolPersonView) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.sortOrder - b.sortOrder;

/** Every person, founders first, then head teachers, teachers and staff, each in their order. */
export async function listSchoolPeople(): Promise<SchoolPersonView[]> {
  const rows = await prisma.schoolPerson.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return rows.map(toView).sort(byKindThenOrder);
}

export interface SchoolPeopleSections {
  /** Founders and head teachers, past and present. */
  leaders: SchoolPersonView[];
  current: SchoolPersonView[];
  former: SchoolPersonView[];
  staff: SchoolPersonView[];
}

/** The people on /school, split into its sections. */
export async function getSchoolPeople(): Promise<SchoolPeopleSections> {
  const shown = (await listSchoolPeople()).filter(isShown);
  return {
    leaders: shown.filter((p) => p.kind === "FOUNDER" || p.kind === "HEAD_TEACHER"),
    current: shown.filter((p) => p.kind === "TEACHER" && p.status === "CURRENT"),
    former: shown.filter((p) => p.kind === "TEACHER" && p.status !== "CURRENT"),
    staff: shown.filter((p) => p.kind === "STAFF"),
  };
}

/** The people in the home page's "With gratitude" panel. */
export async function getHomeTribute(): Promise<SchoolPersonView[]> {
  return (await listSchoolPeople()).filter((p) => p.onHomePage && isShown(p));
}

const fields = fieldReader("INVALID_SCHOOL_PERSON");

function readKind(v: unknown): SchoolPersonKind {
  const value = str(v);
  if (!PERSON_KINDS.some((k) => k.value === value)) throw fields.bad("Please choose founder, head teacher, teacher or office staff.");
  return value as SchoolPersonKind;
}

function readStatus(v: unknown): SchoolPersonStatus {
  const value = str(v);
  if (!PERSON_STATUSES.some((s) => s.value === value)) throw fields.bad("Please choose current, former, late or not known.");
  return value as SchoolPersonStatus;
}

function readPhoto(v: unknown): string | null {
  const url = str(v);
  if (url && !contentImageId(url) && !BUNDLED_PHOTO.test(url)) throw fields.bad("Please upload the photo instead of linking to it.");
  return url || null;
}

type Data = Partial<Omit<SchoolPerson, "id" | "createdAt" | "updatedAt">>;

function validate(input: SchoolPersonInput, partial: boolean): Data {
  const f = fields;
  const data: Data = {};
  if (!partial || input.kind !== undefined) data.kind = readKind(input.kind);
  if (!partial || input.status !== undefined) data.status = readStatus(input.status);
  if (!partial || input.nameBn !== undefined) data.nameBn = f.text(input.nameBn, "name", 2, 200);
  if (input.nameEn !== undefined) data.nameEn = f.optText(input.nameEn, "English name", 200);
  if (input.roleBn !== undefined) data.roleBn = f.optText(input.roleBn, "post", 200);
  if (input.roleEn !== undefined) data.roleEn = f.optText(input.roleEn, "post in English", 200);
  if (input.tenure !== undefined) data.tenure = f.optText(input.tenure, "years", 100);
  if (input.photoUrl !== undefined) data.photoUrl = readPhoto(input.photoUrl);
  if (input.note !== undefined) data.note = f.optText(input.note, "note", 500);
  if (input.onHomePage !== undefined) data.onHomePage = input.onHomePage === true;
  if (input.isPublished !== undefined) data.isPublished = input.isPublished === true;
  if (input.sortOrder !== undefined) data.sortOrder = f.optInt(input.sortOrder, "order", -1000, 1000) ?? 0;
  return data;
}

export async function createSchoolPerson(input: SchoolPersonInput): Promise<SchoolPersonView> {
  const data = validate(input, false);
  const last = await prisma.schoolPerson.aggregate({ _max: { sortOrder: true } });
  const row = await prisma.schoolPerson.create({
    data: {
      kind: data.kind!,
      status: data.status!,
      nameBn: data.nameBn!,
      nameEn: data.nameEn ?? null,
      roleBn: data.roleBn ?? null,
      roleEn: data.roleEn ?? null,
      tenure: data.tenure ?? null,
      photoUrl: data.photoUrl ?? null,
      note: data.note ?? null,
      onHomePage: data.onHomePage ?? false,
      isPublished: data.isPublished ?? true,
      sortOrder: data.sortOrder ?? (last._max.sortOrder ?? 0) + 1,
    },
  });
  return toView(row);
}

export async function updateSchoolPerson(id: string, input: SchoolPersonInput): Promise<SchoolPersonView> {
  const current = await prisma.schoolPerson.findUnique({ where: { id } });
  if (!current) throw new AppError("SCHOOL_PERSON_NOT_FOUND", 404, "Person not found.");
  const data = validate(input, true);
  const row = await prisma.schoolPerson.update({ where: { id }, data });
  if (data.photoUrl !== undefined && current.photoUrl && current.photoUrl !== row.photoUrl) await removeContentImage(current.photoUrl);
  return toView(row);
}

export async function deleteSchoolPerson(id: string): Promise<SchoolPersonView> {
  const current = await prisma.schoolPerson.findUnique({ where: { id } });
  if (!current) throw new AppError("SCHOOL_PERSON_NOT_FOUND", 404, "Person not found.");
  await prisma.schoolPerson.delete({ where: { id } });
  await removeContentImage(current.photoUrl);
  return toView(current);
}

const SEEDED_KEY = "teachers.seeded.2015-souvenir";

/**
 * Imports the first teacher list once (lib/teachers-seed.ts). A setting marks it as done,
 * so people an admin later removes stay removed. Returns how many were added this time.
 */
export async function seedSchoolPeople(): Promise<number> {
  if (await prisma.setting.findUnique({ where: { key: SEEDED_KEY } })) return 0;
  for (const person of FIRST_SCHOOL_PEOPLE) await createSchoolPerson(person);
  await prisma.setting.create({ data: { key: SEEDED_KEY, value: new Date().toISOString() } });
  return FIRST_SCHOOL_PEOPLE.length;
}
