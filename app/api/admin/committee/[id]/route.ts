import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { deleteTerm, updateTerm } from "@/lib/committee";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

const requireAdmin = () => requireArea("committee", "You cannot manage the committee.");

// PATCH /api/admin/committee/[id] — edit a term or make it the current one.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = await readJsonBody(req);
    const term = await updateTerm((await params).id, body);
    await logActivity({
      category: "CONTENT",
      action: "committee.term_updated",
      summary: `Edited committee term "${term.title}"`,
      actor: me,
      targetType: "CommitteeTerm",
      targetId: term.id,
      metadata: { fields: Object.keys(body) },
      req,
    });
    return NextResponse.json({ term });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/committee/[id]");
  }
}

// DELETE /api/admin/committee/[id] — remove a term with its members and photos.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const removed = await deleteTerm((await params).id);
    await logActivity({
      category: "CONTENT",
      action: "committee.term_deleted",
      summary: `Deleted committee term "${removed.title}" (${removed.members.length} members)`,
      actor: me,
      targetType: "CommitteeTerm",
      targetId: removed.id,
      req,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/committee/[id]");
  }
}
