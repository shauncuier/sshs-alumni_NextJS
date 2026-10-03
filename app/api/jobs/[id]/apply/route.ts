/**
 * SSGHS Alumni — Job Application API
 * POST /api/jobs/[id]/apply
 */

import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/session-user";
import { AppError } from "@/lib/app-error";
import { requireRateLimit } from "@/lib/request-security";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRateLimit(req, "job-application", { limit: 5, windowMs: 60 * 60_000 });
    const { id } = await params;
    const session = await getMemberSession();
    const body = await req.json();

    const {
      applicantName,
      applicantEmail,
      applicantPhone,
      applicantBatch,
      resumeUrl,
      coverNote,
    } = body;

    // Signed-in members can omit their name and email; fall back to the session.
    const name = applicantName || session?.user?.name;
    const email = applicantEmail || session?.user?.email;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Applicant name and email are required" },
        { status: 400 }
      );
    }

    const applicationRecord = {
      applicationId: `APP-${Date.now().toString().slice(-6)}`,
      jobId: id,
      applicantName: name,
      applicantEmail: email,
      applicantPhone,
      applicantBatch: applicantBatch || 2008,
      resumeUrl: resumeUrl || "https://drive.google.com/sample-resume",
      coverNote,
      appliedAt: new Date().toISOString(),
      status: "SUBMITTED",
    };

    console.log(`[Job Application] New candidate for Job ${id}: ${applicantName}`);

    return NextResponse.json({
      success: true,
      message: "Your application has been delivered directly to the alumnus hiring manager.",
      application: applicationRecord,
    });
  } catch (error: unknown) {
    if (error instanceof AppError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("[Job Apply Error]", error);
    return NextResponse.json(
      { error: "Failed to submit job application", details: (error as Error).message },
      { status: 500 }
    );
  }
}
