import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { deleteHonorEntry, updateHonorEntry } from "@/lib/honor-board";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

const requireAdmin = () => requireArea("committee", "You cannot manage the honor board.");

// PATCH /api/admin/honor-board/[id] — edit or reorder an entry.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = await readJsonBody(req);
    const entry = await updateHonorEntry((await params).id, body);
    await logActivity({
      category: "CONTENT",
      action: "honor_board.updated",
      summary: `Edited honor board entry ${entry.name}`,
      actor: me,
      targetType: "HonorBoardEntry",
      targetId: entry.id,
      metadata: { fields: Object.keys(body) },
      req,
    });
    return NextResponse.json({ entry });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/honor-board/[id]");
  }
}

// DELETE /api/admin/honor-board/[id] — remove an entry and its photo.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const removed = await deleteHonorEntry((await params).id);
    await logActivity({
      category: "CONTENT",
      action: "honor_board.deleted",
      summary: `Removed ${removed.name} from the honor board`,
      actor: me,
      targetType: "HonorBoardEntry",
      targetId: removed.id,
      req,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/honor-board/[id]");
  }
}
