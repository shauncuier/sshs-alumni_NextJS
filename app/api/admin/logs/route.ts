import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { ACTIVITY_CATEGORIES, listActivity } from "@/lib/activity-log";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

// GET /api/admin/logs?q=&category=&status=&actorId=&page= — the activity log, newest first.
export async function GET(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me || !isAdminRole(me.role)) throw new AppError("FORBIDDEN", 403, "Unauthorized access");
    const p = new URL(req.url).searchParams;
    const result = await listActivity({
      q: p.get("q"),
      category: p.get("category"),
      status: p.get("status"),
      actorId: p.get("actorId"),
      page: Number(p.get("page")) || 1,
    });
    return NextResponse.json({ ...result, categories: ACTIVITY_CATEGORIES });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/logs");
  }
}
