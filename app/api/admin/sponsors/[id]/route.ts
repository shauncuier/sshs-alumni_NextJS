import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { deleteSponsor, updateSponsor } from "@/lib/sponsors";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

const requireAdmin = () => requireArea("committee", "You cannot manage the sponsors.");

// PATCH /api/admin/sponsors/[id] — edit, hide or reorder a sponsor.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = await readJsonBody(req);
    const sponsor = await updateSponsor((await params).id, body);
    await logActivity({
      category: "CONTENT",
      action: "sponsor.updated",
      summary: `Edited sponsor ${sponsor.name}`,
      actor: me,
      targetType: "Sponsor",
      targetId: sponsor.id,
      metadata: { fields: Object.keys(body) },
      req,
    });
    return NextResponse.json({ sponsor });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/sponsors/[id]");
  }
}

// DELETE /api/admin/sponsors/[id] — remove a sponsor and its uploaded logo.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const removed = await deleteSponsor((await params).id);
    await logActivity({
      category: "CONTENT",
      action: "sponsor.deleted",
      summary: `Removed sponsor ${removed.name}`,
      actor: me,
      targetType: "Sponsor",
      targetId: removed.id,
      req,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/sponsors/[id]");
  }
}
