import fs from "node:fs/promises";
import path from "node:path";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { uploadsRoot } from "@/lib/media/avatars";

/**
 * Privacy: an applicant the committee rejected keeps no photo or payment screenshot
 * on the server longer than PRIVACY_REJECTED_DAYS (default 30) after the rejection.
 * Their account row, the decision, the payment's transaction ID and the proof of
 * study stay on record (who applied, what they showed, what was decided, which
 * payment to refund); proofs are kept as the association's records and are
 * visible to admins only. Runs at server start and daily (instrumentation.ts), or
 * on demand with `npm run privacy:cleanup`; each run that removes something is
 * written to the activity log.
 */

const DAY = 86_400_000;
const SCREENSHOT = /\[Payment Screenshot:\s*([^\]]+)\]/g;
const HAS_SCREENSHOT = /\[Payment Screenshot:/;

export function rejectedRetentionDays(env: Record<string, string | undefined> = process.env): number {
  const days = Number(env.PRIVACY_REJECTED_DAYS ?? 30);
  return Number.isInteger(days) && days >= 1 ? days : 30;
}

/** The folder holding an uploaded avatar or payment screenshot, or null when the URL is not ours. */
function uploadDir(url: string | null | undefined): string | null {
  const m = /^\/api\/media\/(avatars|receipts)\/([a-f0-9]{32})\/[\w.]+$/.exec(url ?? "");
  return m ? path.join(uploadsRoot(), m[1], m[2]) : null;
}

export interface PurgeResult {
  users: number;
  folders: number;
}

export async function purgeRejectedApplicantFiles(opts: { now?: Date; days?: number } = {}): Promise<PurgeResult> {
  const now = opts.now ?? new Date();
  const days = opts.days ?? rejectedRetentionDays();
  const cutoff = new Date(now.getTime() - days * DAY);

  const users = await prisma.user.findMany({
    where: { status: "REJECTED" },
    select: {
      id: true,
      updatedAt: true,
      profile: { select: { id: true, avatarUrl: true, avatarOriginalUrl: true } },
      verificationRequests: { select: { status: true, updatedAt: true } },
      eventRegistrations: { select: { id: true, notes: true } },
    },
  });

  let purgedUsers = 0;
  let folders = 0;
  for (const u of users) {
    // Rejected when the last decided request was rejected; without one, the account's last change.
    const rejectedAt = u.verificationRequests
      .filter((r) => r.status === "REJECTED")
      .reduce<Date | null>((latest, r) => (!latest || r.updatedAt > latest ? r.updatedAt : latest), null) ?? u.updatedAt;
    if (rejectedAt > cutoff) continue;

    const dirs = new Set<string>();
    const avatarDirs = [uploadDir(u.profile?.avatarUrl), uploadDir(u.profile?.avatarOriginalUrl)];
    for (const d of avatarDirs) if (d) dirs.add(d);
    const registrations = u.eventRegistrations.filter((r) => r.notes && HAS_SCREENSHOT.test(r.notes));
    for (const r of registrations) {
      for (const m of r.notes!.matchAll(SCREENSHOT)) {
        const d = uploadDir(m[1].trim());
        if (d) dirs.add(d);
      }
    }
    const hasAvatar = Boolean(u.profile?.avatarUrl || u.profile?.avatarOriginalUrl);
    if (!hasAvatar && registrations.length === 0) continue;

    for (const d of dirs) {
      await fs.rm(d, { recursive: true, force: true });
      folders++;
    }
    const stamp = `[Payment screenshot deleted ${now.toISOString().slice(0, 10)} (privacy clean-up)]`;
    await prisma.$transaction([
      ...(hasAvatar ? [prisma.alumniProfile.update({ where: { id: u.profile!.id }, data: { avatarUrl: null, avatarOriginalUrl: null } })] : []),
      ...registrations.map((r) => prisma.eventRegistration.update({ where: { id: r.id }, data: { notes: r.notes!.replace(SCREENSHOT, stamp) } })),
    ]);
    purgedUsers++;
  }

  if (purgedUsers > 0) {
    await logActivity({
      category: "SYSTEM",
      action: "privacy.rejected_files_purged",
      summary: `Deleted photos and payment screenshots of ${purgedUsers} rejected applicant(s) after ${days} days`,
      metadata: { users: purgedUsers, folders, retentionDays: days },
    });
  }
  return { users: purgedUsers, folders };
}
