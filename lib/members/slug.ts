/**
 * Readable profile addresses: /alumni/md-nahidul-islam-2008 instead of a random id.
 * A slug is the name in plain Latin letters plus the SSC batch, with -2, -3 … when two
 * members share both. Set when the account is created and kept when the name changes,
 * so links people shared keep working. Old id links redirect to it (app/alumni/[id]).
 */
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

const MAX_BASE = 100;

/** "Md. Nahidul Islam", 2008 → "md-nahidul-islam-2008"; a name with no Latin letters → "alumni-2008". */
export function slugBase(fullName: string, sscBatch: number | null | undefined): string {
  const name = fullName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_BASE)
    .replace(/-+$/, "");
  const batch = sscBatch && sscBatch > 0 ? String(sscBatch) : "";
  return [name || "alumni", batch].filter(Boolean).join("-");
}

/** A slug no other profile has: the base, else base-2, base-3 … */
export async function uniqueSlug(db: Db, base: string, exceptProfileId?: string): Promise<string> {
  const taken = new Set(
    (
      await db.alumniProfile.findMany({
        where: { slug: { startsWith: base }, ...(exceptProfileId ? { id: { not: exceptProfileId } } : {}) },
        select: { slug: true },
      })
    ).map((p) => p.slug)
  );
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  }
}

/** Gives every profile without a slug one; returns how many were set. Run by the production seed. */
export async function ensureProfileSlugs(db: Db = prisma): Promise<number> {
  const missing = await db.alumniProfile.findMany({
    where: { slug: null },
    select: { id: true, fullName: true, sscBatch: true },
    orderBy: { createdAt: "asc" }, // the earliest member gets the plain name
  });
  for (const p of missing) {
    const slug = await uniqueSlug(db, slugBase(p.fullName, p.sscBatch), p.id);
    await db.alumniProfile.update({ where: { id: p.id }, data: { slug } });
  }
  return missing.length;
}
