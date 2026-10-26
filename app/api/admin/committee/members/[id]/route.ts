import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { deleteMember, updateMember } from "@/lib/committee";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

const requireAdmin = () => requireArea("committee", "You cannot manage the committee.");

// PATCH /api/admin/committee/members/[id] — edit or reorder a committee member.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = await readJsonBody(req);
    const member = await updateMember((await params).id, body);
    await logActivity({
      category: "CONTENT",
      action: "committee.member_updated",
      summary: `Edited committee member ${member.name}`,
      actor: me,
      targetType: "CommitteeMember",
      targetId: member.id,
      metadata: { fields: Object.keys(body) },
      req,
    });
    return NextResponse.json({ member });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/committee/members/[id]");
  }
}

// DELETE /api/admin/committee/members/[id] — remove a committee member and their photo.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const removed = await deleteMember((await params).id);
    await logActivity({
      category: "CONTENT",
      action: "committee.member_removed",
      summary: `Removed ${removed.name} (${removed.post}) from the committee`,
      actor: me,
      targetType: "CommitteeMember",
      targetId: removed.id,
      req,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/committee/members/[id]");
  }
}
