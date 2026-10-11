import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { saveMentorProfile, setMentorStatus } from "@/lib/mentorship";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

// PUT /api/mentorship/profile — create or update the signed-in member's mentor profile.
export async function PUT(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "mentor-profile", { limit: 20, windowMs: 60 * 60_000 });
    const me = await getSessionUser();
    if (!me) throw new AppError("SIGN_IN_REQUIRED", 401, "Please sign in.");
    const { mentor, created } = await saveMentorProfile(me, await readJsonBody(req));
    await logActivity({
      category: "CONTENT",
      action: created ? "mentor.applied" : "mentor.updated",
      summary: `${me.email} ${created ? "applied to become a mentor" : "updated their mentor profile"} (${mentor.domain})`,
      actor: me,
      targetType: "Mentor",
      targetId: mentor.id,
      req,
    });
    return NextResponse.json({ mentor: { id: mentor.id, status: mentor.status } }, { status: created ? 201 : 200 });
  } catch (err) {
    return errorResponse(err, "PUT /api/mentorship/profile");
  }
}

// PATCH /api/mentorship/profile — { action: "PAUSE" | "RESUME" } on one's own listing.
export async function PATCH(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await getSessionUser();
    if (!me) throw new AppError("SIGN_IN_REQUIRED", 401, "Please sign in.");
    const { action, mentorId } = await readJsonBody(req);
    const mentor = await setMentorStatus(me, String(mentorId ?? ""), action);
    await logActivity({ category: "CONTENT", action: action === "PAUSE" ? "mentor.paused" : "mentor.resumed", summary: `${me.email} ${action === "PAUSE" ? "paused" : "resumed"} their mentor listing`, actor: me, targetType: "Mentor", targetId: mentor.id, req });
    return NextResponse.json({ mentor: { id: mentor.id, status: mentor.status } });
  } catch (err) {
    return errorResponse(err, "PATCH /api/mentorship/profile");
  }
}
