import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity, logFailure } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { setMentorStatus } from "@/lib/mentorship";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

type Params = { params: Promise<{ id: string }> };
const PAST: Record<string, string> = { APPROVE: "approved", REJECT: "rejected", PAUSE: "paused", RESUME: "resumed" };

// PATCH /api/admin/mentors/[id] — { action: "APPROVE" | "REJECT" | "PAUSE" | "RESUME", reason? }
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  let me: Awaited<ReturnType<typeof requireArea>> | null = null;
  try {
    requireSameOrigin(req);
    me = await requireArea("mentors", "You cannot review mentors.");
    const { action, reason } = await readJsonBody(req);
    const mentor = await setMentorStatus(me, id, action, reason);
    await logActivity({
      category: "ADMIN",
      action: `mentor.${PAST[String(action)] ?? "updated"}`,
      summary: `${(PAST[String(action)] ?? "updated").replace(/^./, (c) => c.toUpperCase())} mentor ${mentor.name} (${mentor.email})`,
      actor: me,
      targetType: "Mentor",
      targetId: mentor.id,
      metadata: action === "REJECT" ? { reason } : undefined,
      req,
    });
    return NextResponse.json({ mentor: { id: mentor.id, status: mentor.status } });
  } catch (err) {
    await logFailure(err, { category: "ADMIN", action: "mentor.decision_refused", actor: me, targetType: "Mentor", targetId: id, req });
    return errorResponse(err, "PATCH /api/admin/mentors/[id]");
  }
}
