import type { CommitteeMember, CommitteeTerm } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { fieldReader, str } from "@/lib/content-fields";
import { removeContentImage } from "@/lib/media/content-images";

/**
 * The association's executive committee: one term per period, at most one of them
 * current. The current term's members are listed on /committee; older terms on
 * /committee/past, shown as their group photo or scanned list when one is uploaded.
 * Managed in /admin/committee. Also holds the President's message for the home page.
 */

export interface CommitteeMemberView {
  id: string;
  termId: string;
  name: string;
  post: string;
  lifeMemberNo: string | null;
  sscBatch: number | null;
  phone: string | null;
  facebookUrl: string | null;
  photoUrl: string | null;
  note: string | null;
  sortOrder: number;
}

export interface CommitteeTermView {
  id: string;
  title: string;
  startYear: number;
  endYear: number | null;
  isCurrent: boolean;
  imageUrl: string | null;
  sortOrder: number;
  members: CommitteeMemberView[];
}

export interface TermInput {
  title?: unknown;
  startYear?: unknown;
  endYear?: unknown;
  isCurrent?: unknown;
  imageUrl?: unknown;
  sortOrder?: unknown;
}

export interface MemberInput {
  termId?: unknown;
  name?: unknown;
  post?: unknown;
  lifeMemberNo?: unknown;
  sscBatch?: unknown;
  phone?: unknown;
  facebookUrl?: unknown;
  photoUrl?: unknown;
  note?: unknown;
  sortOrder?: unknown;
}

const memberOrder = [{ sortOrder: "asc" as const }, { name: "asc" as const }];

function toMember(m: CommitteeMember): CommitteeMemberView {
  return {
    id: m.id,
    termId: m.termId,
    name: m.name,
    post: m.post,
    lifeMemberNo: m.lifeMemberNo,
    sscBatch: m.sscBatch,
    phone: m.phone,
    facebookUrl: m.facebookUrl,
    photoUrl: m.photoUrl,
    note: m.note,
    sortOrder: m.sortOrder,
  };
}

function toTerm(t: CommitteeTerm & { members: CommitteeMember[] }): CommitteeTermView {
  return {
    id: t.id,
    title: t.title,
    startYear: t.startYear,
    endYear: t.endYear,
    isCurrent: t.isCurrent,
    imageUrl: t.imageUrl,
    sortOrder: t.sortOrder,
    members: t.members.map(toMember),
  };
}

export async function getCurrentCommittee(): Promise<CommitteeTermView | null> {
  const row = await prisma.committeeTerm.findFirst({ where: { isCurrent: true }, include: { members: { orderBy: memberOrder } } });
  return row ? toTerm(row) : null;
}

/** Past terms, newest first. */
export async function listPastTerms(): Promise<CommitteeTermView[]> {
  const rows = await prisma.committeeTerm.findMany({
    where: { isCurrent: false },
    orderBy: [{ startYear: "desc" }, { sortOrder: "asc" }],
    include: { members: { orderBy: memberOrder } },
  });
  return rows.map(toTerm);
}

/** Every term for the admin panel: the current one first, then newest first. */
export async function listAllTerms(): Promise<CommitteeTermView[]> {
  const rows = await prisma.committeeTerm.findMany({
    orderBy: [{ isCurrent: "desc" }, { startYear: "desc" }, { sortOrder: "asc" }],
    include: { members: { orderBy: memberOrder } },
  });
  return rows.map(toTerm);
}

/** The current committee's President (a post named "President", not "Vice-President"), if listed. */
export function findPresident(term: CommitteeTermView | null): CommitteeMemberView | null {
  return term?.members.find((m) => /^\s*president\s*$/i.test(m.post) || /^\s*সভাপতি\s*$/.test(m.post)) ?? null;
}

export interface CommitteeTier {
  key: "lead" | "vice" | "general" | "secretaries" | "members";
  members: CommitteeMemberView[];
}

// Posts by level, English or Bangla, checked in this order (vice before plain president).
const TIER_RULES: [CommitteeTier["key"], RegExp][] = [
  ["vice", /vice[\s-]*president|সহ[\s-]*সভাপতি|joint\s+convener|যুগ্ম\s+আহ্বায়ক/i],
  ["lead", /^\s*(president|convener|chairman|সভাপতি|আহ্বায়ক)\s*$/i],
  ["general", /^\s*(general\s+secretary|member\s+secretary|সাধারণ\s+সম্পাদক|সদস্য\s+সচিব)\s*$/i],
  ["secretaries", /secretary|treasurer|সম্পাদক|কোষাধ্যক্ষ|সচিব/i],
];
const TIER_ORDER: CommitteeTier["key"][] = ["lead", "vice", "general", "secretaries", "members"];

/** The committee as levels for the tree on /committee, top first; empty levels are left out. */
export function committeeTiers(members: CommitteeMemberView[]): CommitteeTier[] {
  const byKey = new Map<CommitteeTier["key"], CommitteeMemberView[]>(TIER_ORDER.map((k) => [k, []]));
  for (const m of members) {
    const key = TIER_RULES.find(([, re]) => re.test(m.post))?.[0] ?? "members";
    byKey.get(key)!.push(m);
  }
  return TIER_ORDER.map((key) => ({ key, members: byKey.get(key)! })).filter((t) => t.members.length > 0);
}

const termFields = fieldReader("INVALID_COMMITTEE_TERM");
const memberFields = fieldReader("INVALID_COMMITTEE_MEMBER");
const maxYear = () => new Date().getFullYear() + 10;

function validateTerm(input: TermInput, partial: boolean) {
  const f = termFields;
  const data: Partial<Pick<CommitteeTerm, "title" | "startYear" | "endYear" | "isCurrent" | "imageUrl" | "sortOrder">> = {};
  if (!partial || input.title !== undefined) data.title = f.text(input.title, "title", 3, 200);
  if (!partial || input.startYear !== undefined) data.startYear = f.int(input.startYear, "start year", 1950, maxYear());
  if (input.endYear !== undefined) data.endYear = f.optInt(input.endYear, "end year", 1950, maxYear());
  if (data.startYear !== undefined && data.endYear != null && data.endYear < data.startYear) {
    throw f.bad("The end year cannot be before the start year.");
  }
  if (input.isCurrent !== undefined) data.isCurrent = input.isCurrent === true;
  if (input.imageUrl !== undefined) data.imageUrl = f.optImage(input.imageUrl);
  if (input.sortOrder !== undefined) data.sortOrder = f.optInt(input.sortOrder, "order", -1000, 1000) ?? 0;
  return data;
}

function validateMember(input: MemberInput, partial: boolean) {
  const f = memberFields;
  const data: Partial<Pick<CommitteeMember, "name" | "post" | "lifeMemberNo" | "sscBatch" | "phone" | "facebookUrl" | "photoUrl" | "note" | "sortOrder">> = {};
  if (!partial || input.name !== undefined) data.name = f.text(input.name, "name", 2, 200);
  if (!partial || input.post !== undefined) data.post = f.text(input.post, "post", 2, 200);
  if (input.lifeMemberNo !== undefined) data.lifeMemberNo = f.optText(input.lifeMemberNo, "life member number", 40);
  if (input.sscBatch !== undefined) data.sscBatch = f.optInt(input.sscBatch, "SSC batch", 1950, new Date().getFullYear() + 1);
  if (input.phone !== undefined) data.phone = f.optPhone(input.phone);
  if (input.facebookUrl !== undefined) data.facebookUrl = f.optFacebook(input.facebookUrl);
  if (input.photoUrl !== undefined) data.photoUrl = f.optImage(input.photoUrl);
  if (input.note !== undefined) data.note = f.optText(input.note, "note", 300);
  if (input.sortOrder !== undefined) data.sortOrder = f.optInt(input.sortOrder, "order", -1000, 1000) ?? 0;
  return data;
}

async function termView(id: string): Promise<CommitteeTermView> {
  const row = await prisma.committeeTerm.findUnique({ where: { id }, include: { members: { orderBy: memberOrder } } });
  if (!row) throw new AppError("TERM_NOT_FOUND", 404, "Committee term not found.");
  return toTerm(row);
}

export async function createTerm(input: TermInput): Promise<CommitteeTermView> {
  const data = validateTerm(input, false);
  const row = await prisma.$transaction(async (tx) => {
    // Only one term is current: making this one current retires the others.
    if (data.isCurrent) await tx.committeeTerm.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    return tx.committeeTerm.create({
      data: {
        title: data.title!,
        startYear: data.startYear!,
        endYear: data.endYear ?? null,
        isCurrent: data.isCurrent ?? false,
        imageUrl: data.imageUrl ?? null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  });
  return termView(row.id);
}

export async function updateTerm(id: string, input: TermInput): Promise<CommitteeTermView> {
  const current = await prisma.committeeTerm.findUnique({ where: { id } });
  if (!current) throw new AppError("TERM_NOT_FOUND", 404, "Committee term not found.");
  const data = validateTerm(input, true);
  const startYear = data.startYear ?? current.startYear;
  const endYear = data.endYear !== undefined ? data.endYear : current.endYear;
  if (endYear != null && endYear < startYear) throw termFields.bad("The end year cannot be before the start year.");
  await prisma.$transaction(async (tx) => {
    if (data.isCurrent) await tx.committeeTerm.updateMany({ where: { isCurrent: true, id: { not: id } }, data: { isCurrent: false } });
    await tx.committeeTerm.update({ where: { id }, data });
  });
  if (data.imageUrl !== undefined && current.imageUrl && current.imageUrl !== data.imageUrl) await removeContentImage(current.imageUrl);
  return termView(id);
}

/** Deletes a term with its members and their photos. */
export async function deleteTerm(id: string): Promise<CommitteeTermView> {
  const removed = await termView(id);
  await prisma.committeeTerm.delete({ where: { id } });
  await removeContentImage(removed.imageUrl);
  for (const m of removed.members) await removeContentImage(m.photoUrl);
  return removed;
}

export async function createMember(input: MemberInput): Promise<CommitteeMemberView> {
  const termId = str(input.termId);
  if (!termId || !(await prisma.committeeTerm.findUnique({ where: { id: termId }, select: { id: true } }))) {
    throw new AppError("TERM_NOT_FOUND", 404, "Committee term not found.");
  }
  const data = validateMember(input, false);
  // New members go to the end of the list unless an order is given.
  const last = await prisma.committeeMember.aggregate({ where: { termId }, _max: { sortOrder: true } });
  const row = await prisma.committeeMember.create({
    data: {
      termId,
      name: data.name!,
      post: data.post!,
      lifeMemberNo: data.lifeMemberNo ?? null,
      sscBatch: data.sscBatch ?? null,
      phone: data.phone ?? null,
      facebookUrl: data.facebookUrl ?? null,
      photoUrl: data.photoUrl ?? null,
      note: data.note ?? null,
      sortOrder: data.sortOrder ?? (last._max.sortOrder ?? 0) + 1,
    },
  });
  return toMember(row);
}

export async function updateMember(id: string, input: MemberInput): Promise<CommitteeMemberView> {
  const current = await prisma.committeeMember.findUnique({ where: { id } });
  if (!current) throw new AppError("MEMBER_NOT_FOUND", 404, "Committee member not found.");
  const data = validateMember(input, true);
  const row = await prisma.committeeMember.update({ where: { id }, data });
  if (data.photoUrl !== undefined && current.photoUrl && current.photoUrl !== row.photoUrl) await removeContentImage(current.photoUrl);
  return toMember(row);
}

export async function deleteMember(id: string): Promise<CommitteeMemberView> {
  const current = await prisma.committeeMember.findUnique({ where: { id } });
  if (!current) throw new AppError("MEMBER_NOT_FOUND", 404, "Committee member not found.");
  await prisma.committeeMember.delete({ where: { id } });
  await removeContentImage(current.photoUrl);
  return toMember(current);
}

// The President's message on the home page, stored as a site setting.
const MESSAGE_KEY = "president-message";

export interface PresidentMessage {
  message: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function getPresidentMessage(): Promise<PresidentMessage> {
  const row = await prisma.setting.findUnique({ where: { key: MESSAGE_KEY } });
  let message = "";
  try {
    const parsed = row ? JSON.parse(row.value) : null;
    if (parsed && typeof parsed.message === "string") message = parsed.message;
  } catch {
    // A damaged value shows no message rather than breaking the home page.
  }
  return { message, updatedAt: row?.updatedAt.toISOString() ?? null, updatedBy: row?.updatedBy ?? null };
}

export async function setPresidentMessage(input: { message?: unknown }, adminEmail: string): Promise<PresidentMessage> {
  const message = str(input.message).replace(/\r\n/g, "\n");
  // The setting column is TEXT (64 KB); Bangla takes 3 bytes a character.
  if (message.length > 8000) throw new AppError("INVALID_PRESIDENT_MESSAGE", 400, "Keep the message to 8,000 characters or fewer.");
  const value = JSON.stringify({ message });
  await prisma.setting.upsert({
    where: { key: MESSAGE_KEY },
    create: { key: MESSAGE_KEY, value, updatedBy: adminEmail },
    update: { value, updatedBy: adminEmail },
  });
  return getPresidentMessage();
}
