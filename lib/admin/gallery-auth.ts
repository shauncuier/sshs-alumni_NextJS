import { AppError } from "@/lib/app-error";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

export async function requireGalleryAdmin() {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) throw new AppError("FORBIDDEN", 403, "Only administrators can manage the gallery.");
  return me;
}
