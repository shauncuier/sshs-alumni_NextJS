/**
 * Who may use which part of the admin panel. One map, used by the admin layout
 * (page access), the admin sidebar (what is shown) and the admin APIs (what is
 * allowed), so the three can never disagree. Safe to import in the browser.
 *
 * Admins and the super admin use everything. Moderators run public content and
 * the event gate: news, notices, gallery, stories, jobs, mentors, feed moderation and the gate scanner,
 * but never members, money, messages to members, settings or the activity log.
 */

export const ADMIN_AREAS = [
  "dashboard",
  "verifications",
  "alumni",
  "sms",
  "volunteers",
  "batches",
  "events",
  "donations",
  "payments",
  "users",
  "news",
  "gallery",
  "stories",
  "jobs",
  "mentors",
  "feed",
  "logs",
  "gate",
  "committee",
  "notices",
  "accounts",
  "settings",
] as const;
export type AdminArea = (typeof ADMIN_AREAS)[number];

const MODERATOR_AREAS: readonly AdminArea[] = ["news", "gallery", "stories", "jobs", "mentors", "feed", "gate", "notices"];

// The treasurer keeps the accounts and sees nothing else of the admin panel.
const TREASURER_AREAS: readonly AdminArea[] = ["accounts"];

const AREAS_BY_ROLE: Record<string, readonly AdminArea[]> = {
  SUPER_ADMIN: ADMIN_AREAS,
  ADMIN: ADMIN_AREAS,
  MODERATOR: MODERATOR_AREAS,
  TREASURER: TREASURER_AREAS,
};

export function can(role: string | null | undefined, area: AdminArea): boolean {
  return Boolean(role && AREAS_BY_ROLE[role]?.includes(area));
}

/** True for any role that may open the admin panel at all. */
export function canUseAdminPanel(role: string | null | undefined): boolean {
  return Boolean(role && (AREAS_BY_ROLE[role]?.length ?? 0) > 0);
}

/** The admin area a /admin path belongs to, or null for unknown paths. */
export function areaForPath(pathname: string): AdminArea | null {
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  const segment = pathname.replace(/^\/admin\/?/, "").split("/")[0];
  if (segment === "achievements") return "stories";
  if (segment === "id-cards") return "alumni";
  if (segment === "honor-board" || segment === "constitution") return "committee";
  return (ADMIN_AREAS as readonly string[]).includes(segment) ? (segment as AdminArea) : null;
}

/** Where a role lands when it opens the admin panel without a specific page. */
export function homeForRole(role: string | null | undefined): string {
  if (can(role, "dashboard")) return "/admin";
  const first = AREAS_BY_ROLE[role ?? ""]?.find((a) => a !== "gate");
  return first ? `/admin/${first}` : "/gate";
}
