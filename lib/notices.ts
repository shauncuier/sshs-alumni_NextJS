import type { Announcement } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { fieldReader, str } from "@/lib/content-fields";
import { removeDocument } from "@/lib/media/documents";

/**
 * The notice board on /notices (stored as Announcement rows), managed in
 * /admin/notices. Only active notices are public; text is plain (blank lines
 * separate paragraphs) and never rendered as HTML. A notice may carry one PDF.
 */

export const NOTICE_PRIORITIES = ["NORMAL", "HIGH", "URGENT"] as const;
export type NoticePriority = (typeof NOTICE_PRIORITIES)[number];

/** The badge a public notice shows for its priority (none for normal notices). */
export const PRIORITY_BADGE: Record<NoticePriority, { label: string; className: string } | null> = {
  NORMAL: null,
  HIGH: { label: "Important", className: "bg-amber-100 text-amber-800" },
  URGENT: { label: "Urgent", className: "bg-rose-100 text-rose-800" },
};

export interface NoticeView {
  id: string;
  title: string;
  content: string;
  priority: NoticePriority;
  author: string;
  isActive: boolean;
  attachmentUrl: string | null;
  publishedAt: string;
  /** Publication date for display, e.g. "26 October 2026". */
  date: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface NoticeInput {
  title?: unknown;
  content?: unknown;
  priority?: unknown;
  author?: unknown;
  isActive?: unknown;
  attachmentUrl?: unknown;
}

const formatDate = (d: Date) => d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Dhaka" });

function toView(a: Announcement): NoticeView {
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    priority: (NOTICE_PRIORITIES as readonly string[]).includes(a.priority) ? (a.priority as NoticePriority) : "NORMAL",
    author: a.author,
    isActive: a.isActive,
    attachmentUrl: a.attachmentUrl,
    publishedAt: a.publishedAt.toISOString(),
    date: formatDate(a.publishedAt),
    updatedAt: a.updatedAt.toISOString(),
    updatedBy: a.updatedBy,
  };
}

/** Active notices, newest first. */
export async function listActiveNotices(limit = 100): Promise<NoticeView[]> {
  const rows = await prisma.announcement.findMany({ where: { isActive: true }, orderBy: { publishedAt: "desc" }, take: limit });
  return rows.map(toView);
}

export async function getActiveNotice(id: string): Promise<NoticeView | null> {
  const row = await prisma.announcement.findFirst({ where: { id, isActive: true } });
  return row ? toView(row) : null;
}

/** Every notice for the admin panel: active first, newest first. */
export async function listAllNotices(): Promise<NoticeView[]> {
  const rows = await prisma.announcement.findMany({ orderBy: [{ isActive: "desc" }, { publishedAt: "desc" }] });
  return rows.map(toView);
}

const fields = fieldReader("INVALID_NOTICE");

function validate(input: NoticeInput, partial: boolean) {
  const f = fields;
  const data: Partial<Pick<Announcement, "title" | "content" | "priority" | "author" | "isActive" | "attachmentUrl">> = {};
  if (!partial || input.title !== undefined) data.title = f.text(input.title, "title", 3, 190);
  if (!partial || input.content !== undefined) {
    const content = str(input.content).replace(/\r\n/g, "\n");
    if (content.length < 10) throw f.bad("Please write the notice (at least a sentence).");
    // The column is TEXT (64 KB); Bangla takes 3 bytes a character.
    if (content.length > 20_000) throw f.bad("The notice is too long; attach a PDF for long documents.");
    data.content = content;
  }
  if (!partial || input.priority !== undefined) {
    const priority = input.priority === undefined ? "NORMAL" : input.priority;
    if (!(NOTICE_PRIORITIES as readonly unknown[]).includes(priority)) throw f.bad("Please choose a priority.");
    data.priority = priority as string;
  }
  if (!partial || input.author !== undefined) data.author = f.optText(input.author, "signed-by line", 120) ?? "Praktan Sabujian Parishad";
  if (input.isActive !== undefined) data.isActive = input.isActive === true;
  if (input.attachmentUrl !== undefined) data.attachmentUrl = f.optDocument(input.attachmentUrl);
  return data;
}

export async function createNotice(input: NoticeInput, adminEmail: string): Promise<NoticeView> {
  const data = validate(input, false);
  const row = await prisma.announcement.create({
    data: {
      title: data.title!,
      content: data.content!,
      priority: data.priority!,
      author: data.author!,
      isActive: data.isActive ?? true,
      attachmentUrl: data.attachmentUrl ?? null,
      publishedAt: new Date(),
      createdBy: adminEmail,
      updatedBy: adminEmail,
    },
  });
  return toView(row);
}

export async function updateNotice(id: string, input: NoticeInput, adminEmail: string): Promise<NoticeView> {
  const current = await prisma.announcement.findUnique({ where: { id } });
  if (!current) throw new AppError("NOTICE_NOT_FOUND", 404, "Notice not found.");
  const data = validate(input, true);
  const row = await prisma.announcement.update({ where: { id }, data: { ...data, updatedBy: adminEmail } });
  if (data.attachmentUrl !== undefined && current.attachmentUrl && current.attachmentUrl !== row.attachmentUrl) await removeDocument(current.attachmentUrl);
  return toView(row);
}

export async function deleteNotice(id: string): Promise<NoticeView> {
  const current = await prisma.announcement.findUnique({ where: { id } });
  if (!current) throw new AppError("NOTICE_NOT_FOUND", 404, "Notice not found.");
  await prisma.announcement.delete({ where: { id } });
  await removeDocument(current.attachmentUrl);
  return toView(current);
}
