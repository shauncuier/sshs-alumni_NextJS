import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { deleteConstitution, updateConstitution } from "@/lib/constitution";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

const requireAdmin = () => requireArea("committee", "You cannot manage the constitution.");

// PATCH /api/admin/constitution/[id] — edit a version or replace its PDF.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = await readJsonBody(req);
    const document = await updateConstitution((await params).id, body);
    await logActivity({
      category: "CONTENT",
      action: "constitution.updated",
      summary: `Edited constitution "${document.title}"`,
      actor: me,
      targetType: "ConstitutionDocument",
      targetId: document.id,
      metadata: { fields: Object.keys(body) },
      req,
    });
    return NextResponse.json({ document });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/constitution/[id]");
  }
}

// DELETE /api/admin/constitution/[id] — remove a version and its PDF.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const removed = await deleteConstitution((await params).id);
    await logActivity({
      category: "CONTENT",
      action: "constitution.deleted",
      summary: `Deleted constitution "${removed.title}"`,
      actor: me,
      targetType: "ConstitutionDocument",
      targetId: removed.id,
      req,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/constitution/[id]");
  }
}
