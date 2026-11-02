/**
 * Who sees a member's real photo. A hidden photo (lib/members/gender.ts photoIsPublic) is
 * replaced by HIDDEN_PHOTO_AVATAR for everyone except the member herself and admins, so its
 * address never reaches them; the file route refuses it too (app/api/media/avatars).
 */
import { HIDDEN_PHOTO_AVATAR } from "@/lib/avatar";
import { photoIsPublic } from "@/lib/members/gender";

/** Add to every profile query whose photo is shown to other people. */
export const PHOTO_PRIVACY_SELECT = { userId: true, gender: true, isPhotoPublic: true } as const;

export type PhotoPrivacy = { userId?: string | null; gender?: string | null; isPhotoPublic?: boolean | null };
export type PhotoViewer = { id: string; role: string } | null | undefined;

/** Whether `viewer` may see this member's real photo. */
export function canSeePhoto(profile: PhotoPrivacy, viewer?: PhotoViewer): boolean {
  if (photoIsPublic(profile)) return true;
  if (!viewer) return false;
  return viewer.role === "ADMIN" || viewer.role === "SUPER_ADMIN" || (!!profile.userId && profile.userId === viewer.id);
}

/** The photo address to give `viewer`: the real one (or null when there is none), else the silhouette. */
export function shownAvatar<T extends string | null | undefined>(avatarUrl: T, profile: PhotoPrivacy, viewer?: PhotoViewer): T | string {
  return canSeePhoto(profile, viewer) ? avatarUrl : HIDDEN_PHOTO_AVATAR;
}
