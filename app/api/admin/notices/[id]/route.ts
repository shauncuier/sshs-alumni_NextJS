import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { deleteNotice, updateNotice } from "@/lib/notices";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

const requireAdmin = () => requireArea("notices", "You cannot manage notices.");

// PATCH /api/admin/notices/[id] — edit a notice, or hide/show it.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = await readJsonBody(req);
    const notice = await updateNotice((await params).id, body, me.email);
    const action = body.isActive === false ? "notice.hidden" : body.isActive === true ? "notice.posted" : "notice.updated";
    await logActivity({
      category: "CONTENT",
      action,
      summary: `${action === "notice.hidden" ? "Hid" : action === "notice.posted" ? "Posted" : "Edited"} notice "${notice.title}"`,
      actor: me,
      targetType: "Announcement",
      targetId: notice.id,
      metadata: { fields: Object.keys(body) },
      req,
    });
    return NextResponse.json({ notice });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/notices/[id]");
  }
}

// DELETE /api/admin/notices/[id] — remove a notice and its attachment.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const removed = await deleteNotice((await params).id);
    await logActivity({ category: "CONTENT", action: "notice.deleted", summary: `Deleted notice "${removed.title}"`, actor: me, targetType: "Announcement", targetId: removed.id, req });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/notices/[id]");
  }
}
