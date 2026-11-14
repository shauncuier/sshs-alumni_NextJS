/**
 * The souvenir book's member list for an event (Admin → Events → "Souvenir list"):
 * batch, name, profession / designation, mobile and blood group of every member whose
 * registration is paid (confirmed or checked in), with their photo. Guests are not listed;
 * pending payments are left out until the committee confirms them.
 *
 * Downloaded as one zip by app/api/admin/events/[id]/souvenir-list/route.ts: the list
 * as Excel, and a photos folder whose file names match the list's ছবি column
 * ("001-2010-Rahim-Uddin.jpg"). Photos are the print masters (lib/media/avatars.ts),
 * hidden ones included: the committee asked for every paid member's photo.
 */
import fs from "node:fs/promises";
import path from "node:path";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { avatarFilePath, type AvatarFile } from "@/lib/media/avatars";
import { toXlsx } from "@/lib/xlsx";
import type { ZipFile } from "@/lib/zip";

export const SOUVENIR_HEADER = ["ক্রম", "ব্যাচ", "নাম", "পেশা/পদবী", "মোবাইল নং", "রক্তের গ্রুপ", "ছবি"];
export const PHOTO_FOLDER = "photos";
export const NO_PHOTO = "ছবি নেই";

export interface SouvenirRow {
  batch: number | null;
  name: string;
  work: string;
  phone: string;
  bloodGroup: string;
  /** The photo's name in the zip's photos folder, or null when the member has none. */
  photo: string | null;
  /** Where that photo is on disk (never sent to the browser). */
  photoPath: string | null;
}

/** "Assistant Professor, Dhaka University": the designation, or else the profession, then the company. */
export function workLine(p: { designation?: string | null; profession?: string | null; company?: string | null }): string {
  const role = p.designation?.trim() || p.profession?.trim() || "";
  const company = p.company?.trim() || "";
  return [role, company].filter(Boolean).join(", ");
}

/** The disk path of a stored member photo ("/api/media/avatars/<id>/original.jpg"), else null. */
export function photoDiskPath(url: string | null | undefined): string | null {
  const m = /^\/api\/media\/avatars\/([a-f0-9]{32})\/(original\.jpg|avatar\.webp)$/.exec(url ?? "");
  return m ? avatarFilePath(m[1], m[2] as AvatarFile) : null;
}

const exists = (p: string) => fs.stat(p).then((s) => s.isFile(), () => false);

/** "001-2010-Rahim-Uddin.jpg": the list's number, batch and English name, safe on any computer. */
function photoName(serial: number, batch: number | null, englishName: string, ext: string): string {
  const name = englishName.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "member";
  return `${String(serial).padStart(3, "0")}-${batch ?? "batch"}-${name}${ext}`;
}

export async function souvenirList(eventId: string): Promise<{ event: { title: string; slug: string }; rows: SouvenirRow[] }> {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { title: true, slug: true } });
  if (!event) throw new AppError("NOT_FOUND", 404, "Event not found.");
  const regs = await prisma.eventRegistration.findMany({
    where: { eventId, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
    select: {
      user: {
        select: {
          email: true,
          profile: {
            select: {
              fullName: true,
              fullNameBn: true,
              sscBatch: true,
              profession: true,
              designation: true,
              company: true,
              phone: true,
              bloodGroup: true,
              avatarUrl: true,
              avatarOriginalUrl: true,
            },
          },
        },
      },
    },
  });

  const people = await Promise.all(
    regs.map(async ({ user: { email, profile: p } }) => {
      // The print master when there is one, else the 400 px web photo.
      let photoPath: string | null = null;
      for (const url of [p?.avatarOriginalUrl, p?.avatarUrl]) {
        const candidate = photoDiskPath(url);
        if (candidate && (await exists(candidate))) {
          photoPath = candidate;
          break;
        }
      }
      return {
        batch: p?.sscBatch ?? null,
        name: p?.fullNameBn?.trim() || p?.fullName?.trim() || email,
        englishName: p?.fullName?.trim() || email.split("@")[0],
        work: p ? workLine(p) : "",
        phone: p?.phone ?? "",
        bloodGroup: p?.bloodGroup ?? "",
        photoPath,
      };
    })
  );
  people.sort((a, b) => (a.batch ?? 9999) - (b.batch ?? 9999) || a.name.localeCompare(b.name, "bn"));

  const rows = people.map(({ englishName, ...r }, i) => ({
    ...r,
    photo: r.photoPath ? photoName(i + 1, r.batch, englishName, path.extname(r.photoPath)) : null,
  }));
  return { event, rows };
}

export function souvenirXlsx(rows: SouvenirRow[]): Buffer {
  return toXlsx({
    sheetName: "Souvenir list",
    header: SOUVENIR_HEADER,
    rows: rows.map((r, i) => [i + 1, r.batch, r.name, r.work, r.phone, r.bloodGroup, r.photo ?? NO_PHOTO]),
    widths: [7, 9, 32, 44, 16, 13, 34],
  });
}

/** The zip's files, one at a time: the Excel list first, then each photo. A photo that can't be read is skipped. */
export async function* souvenirZipFiles(rows: SouvenirRow[], listName: string): AsyncGenerator<ZipFile> {
  yield { name: listName, data: souvenirXlsx(rows), store: true };
  for (const r of rows) {
    if (!r.photo || !r.photoPath) continue;
    const data = await fs.readFile(r.photoPath).catch(() => null);
    if (data) yield { name: `${PHOTO_FOLDER}/${r.photo}`, data, store: true };
  }
}
