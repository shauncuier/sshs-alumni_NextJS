import { AppError } from "@/lib/app-error";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

/** The signed-in admin, or a 403 AppError with `message`. */
export async function requireAdmin(message = "Only administrators can do this.") {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) throw new AppError("FORBIDDEN", 403, message);
  return me;
}
