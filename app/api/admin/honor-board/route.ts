import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { createHonorEntry, listHonorEntries } from "@/lib/honor-board";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

const requireAdmin = () => requireArea("committee", "You cannot manage the honor board.");

// GET /api/admin/honor-board — every entry in display order.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ entries: await listHonorEntries() });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/honor-board");
  }
}

// POST /api/admin/honor-board — add a name to the honor board.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const entry = await createHonorEntry(await readJsonBody(req));
    await logActivity({
      category: "CONTENT",
      action: "honor_board.added",
      summary: `Added ${entry.name} to the honor board (${entry.honour})`,
      actor: me,
      targetType: "HonorBoardEntry",
      targetId: entry.id,
      req,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/honor-board");
  }
}
