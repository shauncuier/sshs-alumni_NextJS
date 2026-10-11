import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { AppError } from "@/lib/app-error";
import { createUser, listUsers } from "@/lib/admin/users";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

async function requireAdmin() {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) throw new AppError("FORBIDDEN", 403, "Unauthorized access");
  return me;
}

// GET /api/admin/users?q=&role=&status=&page= — search and page through accounts.
export async function GET(req: Request) {
  try {
    const me = await requireAdmin();
    const params = new URL(req.url).searchParams;
    const result = await listUsers({ q: params.get("q"), role: params.get("role"), status: params.get("status"), page: Number(params.get("page")) || 1 });
    // The page uses the viewer to show only the actions the server will allow.
    return NextResponse.json({ ...result, viewer: { id: me.id, role: me.role } });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/users");
  }
}

// POST /api/admin/users — add a verified account.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    requireRateLimit(req, "admin-user-create", { limit: 30, windowMs: 60 * 60_000 });
    const user = await createUser(me, await readJsonBody(req));
    await logActivity({ category: "ADMIN", action: "user.created", summary: `Created ${user.role} account ${user.email}`, actor: me, targetType: "User", targetId: user.id, metadata: { role: user.role }, req });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/users");
  }
}
