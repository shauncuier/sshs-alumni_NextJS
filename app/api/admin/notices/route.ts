import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { createNotice, listAllNotices, NOTICE_PRIORITIES } from "@/lib/notices";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

const requireAdmin = () => requireArea("notices", "You cannot manage notices.");

// GET /api/admin/notices — every notice, active first.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ notices: await listAllNotices(), priorities: NOTICE_PRIORITIES });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/notices");
  }
}

// POST /api/admin/notices — post a notice (active unless isActive is false).
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const notice = await createNotice(await readJsonBody(req), me.email);
    await logActivity({
      category: "CONTENT",
      action: notice.isActive ? "notice.posted" : "notice.drafted",
      summary: `${notice.isActive ? "Posted" : "Drafted"} notice "${notice.title}"`,
      actor: me,
      targetType: "Announcement",
      targetId: notice.id,
      metadata: { priority: notice.priority },
      req,
    });
    return NextResponse.json({ notice }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/notices");
  }
}
