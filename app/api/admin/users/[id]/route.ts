import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { updateUser, type UserChange } from "@/lib/admin/users";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/users/[id] — { action: "role", role } | { action: "disable" | "enable" } | { action: "password", password }
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await getSessionUser();
    if (!me || !isAdminRole(me.role)) throw new AppError("FORBIDDEN", 403, "Unauthorized access");
    requireRateLimit(req, "admin-user-update", { limit: 120, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    return NextResponse.json({ user: await updateUser(me, (await params).id, body as UserChange) });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/users/[id]");
  }
}
