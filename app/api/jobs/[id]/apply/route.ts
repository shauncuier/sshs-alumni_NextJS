import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { applyToJob, notifyPoster } from "@/lib/jobs";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

type Params = { params: Promise<{ id: string }> };

// POST /api/jobs/[id]/apply — apply to an open job; the poster is emailed.
export async function POST(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "job-application", { limit: 10, windowMs: 60 * 60_000 });
    const me = await getSessionUser();
    const body = await readJsonBody(req);
    // Signed-in members may leave name and email empty; their account fills them in.
    if (me && !body.applicantEmail) body.applicantEmail = me.email;
    const { application, job } = await applyToJob((await params).id, body, me?.id ?? null);
    const emailed = await notifyPoster(job, application);
    await logActivity({
      category: "CONTENT",
      action: "job.applied",
      summary: `${application.email} applied for "${job.title}"${emailed ? "" : " (poster not emailed)"}`,
      actor: me ?? { email: application.email },
      targetType: "Job",
      targetId: job.id,
      metadata: { applicationId: application.id, applicantName: application.name },
      req,
    });
    return NextResponse.json({
      success: true,
      message: "Your application has been sent to the alumnus who posted this job.",
      applicationId: application.id,
    });
  } catch (err) {
    return errorResponse(err, "POST /api/jobs/[id]/apply");
  }
}
