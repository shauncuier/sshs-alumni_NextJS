/**
 * Keeps a member's photo files in step with who may see them (lib/members/photo-privacy.ts).
 * Server only (disk and database).
 */
import prisma from "@/lib/prisma";
import { avatarIdOf, copyAvatarDir, removeAvatarDir, uploadsRoot } from "@/lib/media/avatars";
import path from "node:path";
import { photoIsPublic } from "@/lib/members/gender";

type PrivacyState = { gender?: string | null; isPhotoPublic?: boolean | null };

/**
 * Called after a member's gender or photo choice changed. When her photo went from shown
 * to hidden, her profile moves to a copy of it at a new address: a browser or anyone who
 * kept the old (public, cached) address gets nothing, because no profile owns that address
 * any more (the file route then serves it to admins only). Nothing is ever deleted: the
 * old folder stays on disk, and when anything fails her profile keeps the old address.
 */
export async function moveAvatarIfNowHidden(
  userId: string,
  before: PrivacyState
): Promise<{ avatarUrl: string | null; avatarOriginalUrl: string | null } | null> {
  const now = await prisma.alumniProfile.findUnique({
    where: { userId },
    select: { gender: true, isPhotoPublic: true, avatarUrl: true, avatarOriginalUrl: true },
  });
  if (!now || !photoIsPublic(before) || photoIsPublic(now)) return null;
  const id = avatarIdOf(now.avatarUrl);
  if (!id) return null;
  let next: string;
  try {
    next = await copyAvatarDir(id);
  } catch (err) {
    console.error(`[photo-files] Could not copy the photo folder ${id} (${(err as NodeJS.ErrnoException)?.code ?? "error"}).`);
    return null;
  }
  const swap = (url: string | null) => (url && avatarIdOf(url) === id ? url.replace(id, next) : url);
  const moved = { avatarUrl: swap(now.avatarUrl), avatarOriginalUrl: swap(now.avatarOriginalUrl) };
  try {
    await prisma.alumniProfile.update({ where: { userId }, data: moved });
  } catch (err) {
    await removeAvatarDir(path.join(uploadsRoot(), "avatars", next)); // only the unused new copy
    console.error(`[photo-files] Could not save the moved photo address for a member.`);
    throw err;
  }
  return moved;
}
