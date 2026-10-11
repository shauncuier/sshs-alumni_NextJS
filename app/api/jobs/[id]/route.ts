import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity, logFailure } from "@/lib/activity-log";
import { decideJob } from "@/lib/jobs";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/jobs/[id] — { action: "CLOSE" } by the poster or an admin;
// { action: "APPROVE" } or { action: "REJECT", reason } by an admin.
export async function PATCH(req: Request, { params }: Params) {
  const me = await getSessionUser();
  const { id } = await params;
  try {
    requireSameOrigin(req);
    if (!me) throw new AppError("SIGN_IN_REQUIRED", 401, "Please sign in.");
    const { action, reason } = await readJsonBody(req);
    const job = await decideJob(me, id, action, reason);
    const verb = action === "APPROVE" ? "Approved" : action === "REJECT" ? "Rejected" : "Closed";
    await logActivity({
      category: action === "CLOSE" ? "CONTENT" : "ADMIN",
      action: action === "APPROVE" ? "job.approved" : action === "REJECT" ? "job.rejected" : "job.closed",
      summary: `${verb} job "${job.title}" at ${job.company}`,
      actor: me,
      targetType: "Job",
      targetId: job.id,
      metadata: action === "REJECT" ? { reason } : undefined,
      req,
    });
    return NextResponse.json({ job: { id: job.id, status: job.status } });
  } catch (err) {
    await logFailure(err, { category: "ADMIN", action: "job.decision_refused", actor: me, targetType: "Job", targetId: id, req });
    return errorResponse(err, "PATCH /api/jobs/[id]");
  }
}
