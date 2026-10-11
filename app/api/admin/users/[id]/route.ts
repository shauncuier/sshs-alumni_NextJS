import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity, logFailure } from "@/lib/activity-log";
import { AppError } from "@/lib/app-error";
import { updateUser, type UserChange } from "@/lib/admin/users";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/users/[id] — { action: "role", role } | { action: "disable" | "enable" } | { action: "password", password }
export async function PATCH(req: Request, { params }: Params) {
  let me: Awaited<ReturnType<typeof getSessionUser>> = null;
  const { id } = await params;
  try {
    requireSameOrigin(req);
    me = await getSessionUser();
    if (!me || !isAdminRole(me.role)) throw new AppError("FORBIDDEN", 403, "Unauthorized access");
    requireRateLimit(req, "admin-user-update", { limit: 120, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    const change = body as UserChange;
    const user = await updateUser(me, id, change);
    const what = change.action === "role" ? `changed role of ${user.email} to ${user.role}` : change.action === "password" ? `reset password of ${user.email}` : `${change.action}d ${user.email}`;
    await logActivity({ category: "ADMIN", action: `user.${change.action}`, summary: what.charAt(0).toUpperCase() + what.slice(1), actor: me, targetType: "User", targetId: user.id, metadata: { role: user.role }, req });
    return NextResponse.json({ user });
  } catch (err) {
    await logFailure(err, { category: "ADMIN", action: "user.change_refused", actor: me, targetType: "User", targetId: id, req });
    return errorResponse(err, "PATCH /api/admin/users/[id]");
  }
}
