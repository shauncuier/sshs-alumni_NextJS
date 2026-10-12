import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity, logFailure } from "@/lib/activity-log";
import { createJob, listOpenJobs } from "@/lib/jobs";
import { readJsonBody, LARGE_JSON_BYTES, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

// GET /api/jobs — approved jobs still taking applications.
export async function GET() {
  try {
    const jobs = await listOpenJobs();
    return NextResponse.json({ total: jobs.length, jobs });
  } catch (err) {
    return errorResponse(err, "GET /api/jobs");
  }
}

// POST /api/jobs — a verified member posts a job; it waits for admin approval.
export async function POST(req: Request) {
  const me = await getSessionUser();
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "job-posting", { limit: 5, windowMs: 60 * 60_000 });
    if (!me) throw new AppError("SIGN_IN_REQUIRED", 401, "Please sign in to post a job.");
    const job = await createJob(me, await readJsonBody(req, LARGE_JSON_BYTES));
    await logActivity({
      category: "CONTENT",
      action: job.status === "APPROVED" ? "job.posted" : "job.submitted",
      summary: `${me.email} ${job.status === "APPROVED" ? "posted" : "submitted for review"} job "${job.title}" at ${job.company}`,
      actor: me,
      targetType: "Job",
      targetId: job.id,
      req,
    });
    return NextResponse.json(
      {
        success: true,
        status: job.status,
        jobId: job.id,
        message: job.status === "APPROVED" ? "Your job is live on the Career Hub." : "Thank you — the committee will review your job and publish it shortly.",
      },
      { status: 201 }
    );
  } catch (err) {
    await logFailure(err, { category: "CONTENT", action: "job.post_refused", actor: me, req });
    return errorResponse(err, "POST /api/jobs");
  }
}
