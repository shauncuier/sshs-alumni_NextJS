import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { setPresidentMessage } from "@/lib/committee";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

// PUT /api/admin/president-message — the President's message on the home page ({ message }; blank hides it).
export async function PUT(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireArea("committee", "You cannot manage the committee.");
    const saved = await setPresidentMessage(await readJsonBody(req), me.email);
    await logActivity({
      category: "CONTENT",
      action: "committee.president_message",
      summary: saved.message ? "Updated the President's message" : "Removed the President's message",
      actor: me,
      targetType: "Setting",
      targetId: "president-message",
      req,
    });
    return NextResponse.json({ presidentMessage: saved });
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/president-message");
  }
}
