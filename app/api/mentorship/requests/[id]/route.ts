import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity, logFailure } from "@/lib/activity-log";
import { respondToRequest } from "@/lib/mentorship";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/mentorship/requests/[id] — the mentor: { action: "ACCEPT", meetingDetails, reply }
// or { action: "DECLINE", reply }; the mentee: { action: "CANCEL" }.
export async function PATCH(req: Request, { params }: Params) {
  const me = await getSessionUser();
  const { id } = await params;
  try {
    requireSameOrigin(req);
    if (!me) throw new AppError("SIGN_IN_REQUIRED", 401, "Please sign in.");
    const body = await readJsonBody(req);
    const updated = await respondToRequest(me, id, body.action, body);
    const verb = updated.status === "ACCEPTED" ? "accepted" : updated.status === "DECLINED" ? "declined" : "cancelled";
    await logActivity({ category: "CONTENT", action: `mentorship.${verb}`, summary: `${me.email} ${verb} mentorship request ${id}`, actor: me, targetType: "MentorshipRequest", targetId: id, req });
    return NextResponse.json({ request: { id: updated.id, status: updated.status } });
  } catch (err) {
    await logFailure(err, { category: "CONTENT", action: "mentorship.response_refused", actor: me, targetType: "MentorshipRequest", targetId: id, req });
    return errorResponse(err, "PATCH /api/mentorship/requests/[id]");
  }
}
