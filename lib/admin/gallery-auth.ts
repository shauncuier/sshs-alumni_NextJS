import { AppError } from "@/lib/app-error";
import { getSessionUser } from "@/lib/session-user";
import { can } from "@/lib/permissions";

export async function requireGalleryAdmin() {
  const me = await getSessionUser();
  if (!me || !can(me.role, "gallery")) throw new AppError("FORBIDDEN", 403, "You cannot manage the gallery.");
  return me;
}
