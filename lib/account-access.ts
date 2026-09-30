export const STAFF_ROLES = ["ADMIN", "SUPER_ADMIN", "MODERATOR"] as const;

export type AccessBlock = { code: "PENDING_APPROVAL" | "MEMBERSHIP_REJECTED"; message: string };

export const PENDING_APPROVAL_MESSAGE =
  "Your membership is awaiting approval — the committee is checking your payment. You can sign in once it is approved.";
/** A PENDING account with no membership payment waiting for review: an old free sign-up that never paid. */
export const LEGACY_PENDING_MESSAGE =
  "Your account is waiting for approval by the alumni committee. Please contact the committee to complete your membership.";
/**
 * Shown on /login?blocked=pending. The redirect only knows the account is PENDING, not whether a
 * membership payment is under review, so this wording is true for both kinds of pending account.
 */
export const PENDING_BANNER_MESSAGE =
  "Your membership is awaiting approval by the alumni committee. You can sign in once it is approved.";
export const MEMBERSHIP_REJECTED_MESSAGE =
  "Your membership application was not approved. Please contact the alumni committee.";

/** Why this account may not use member features, or null when it may. */
export function accountAccessBlock(user: { role?: string | null; status?: string | null }): AccessBlock | null {
  if (user.role && (STAFF_ROLES as readonly string[]).includes(user.role)) return null;
  if (user.status === "PENDING") return { code: "PENDING_APPROVAL", message: PENDING_APPROVAL_MESSAGE };
  if (user.status === "REJECTED") return { code: "MEMBERSHIP_REJECTED", message: MEMBERSHIP_REJECTED_MESSAGE };
  return null;
}
