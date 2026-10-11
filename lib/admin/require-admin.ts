import { AppError } from "@/lib/app-error";
import { can, type AdminArea } from "@/lib/permissions";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

/** The signed-in admin (or super admin), or a 403 AppError with `message`. */
export async function requireAdmin(message = "Only administrators can do this.") {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) throw new AppError("FORBIDDEN", 403, message);
  return me;
}

/** The signed-in user if their role may use `area` (see lib/permissions.ts), or a 403 AppError. */
export async function requireArea(area: AdminArea, message = "You do not have access to this part of the admin panel.") {
  const me = await getSessionUser();
  if (!me || !can(me.role, area)) throw new AppError("FORBIDDEN", 403, message);
  return me;
}
