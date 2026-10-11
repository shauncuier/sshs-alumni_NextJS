import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity, logFailure } from "@/lib/activity-log";
import { createRequest } from "@/lib/mentorship";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

// POST /api/mentorship/requests — a verified member asks a mentor for a session.
export async function POST(req: Request) {
  const me = await getSessionUser();
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "mentorship-request", { limit: 10, windowMs: 60 * 60_000 });
    if (!me) throw new AppError("SIGN_IN_REQUIRED", 401, "Please sign in to request mentorship.");
    const { request, mentor, emailed } = await createRequest(me, await readJsonBody(req));
    await logActivity({
      category: "CONTENT",
      action: "mentorship.requested",
      summary: `${me.email} requested mentorship from ${mentor.name} on "${request.topic}"${emailed ? "" : " (mentor not emailed)"}`,
      actor: me,
      targetType: "MentorshipRequest",
      targetId: request.id,
      metadata: { mentorId: mentor.id },
      req,
    });
    return NextResponse.json({ request: { id: request.id, status: request.status } }, { status: 201 });
  } catch (err) {
    await logFailure(err, { category: "CONTENT", action: "mentorship.request_refused", actor: me, req });
    return errorResponse(err, "POST /api/mentorship/requests");
  }
}
