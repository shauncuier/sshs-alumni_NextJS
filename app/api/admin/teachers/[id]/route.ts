import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { deleteSchoolPerson, updateSchoolPerson } from "@/lib/teachers";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

const requireAdmin = () => requireArea("teachers", "You cannot manage the teachers.");

// PATCH /api/admin/teachers/[id] — edit, change the status of, hide or reorder a person.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = await readJsonBody(req);
    const person = await updateSchoolPerson((await params).id, body);
    await logActivity({
      category: "CONTENT",
      action: "teacher.updated",
      summary: `Edited ${person.nameEn || person.nameBn} in the teachers`,
      actor: me,
      targetType: "SchoolPerson",
      targetId: person.id,
      metadata: { fields: Object.keys(body) },
      req,
    });
    return NextResponse.json({ person });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/teachers/[id]");
  }
}

// DELETE /api/admin/teachers/[id] — remove a person and their uploaded photo.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const removed = await deleteSchoolPerson((await params).id);
    await logActivity({
      category: "CONTENT",
      action: "teacher.deleted",
      summary: `Removed ${removed.nameEn || removed.nameBn} from the teachers`,
      actor: me,
      targetType: "SchoolPerson",
      targetId: removed.id,
      req,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/teachers/[id]");
  }
}
