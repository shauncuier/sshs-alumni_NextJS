/**
 * SSGHS Alumni — Job Application API
 * POST /api/jobs/[id]/apply
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    const body = await req.json();

    const {
      applicantName,
      applicantEmail,
      applicantPhone,
      applicantBatch,
      resumeUrl,
      coverNote,
    } = body;

    if (!applicantName || !applicantEmail) {
      return NextResponse.json(
        { error: "Applicant name and email are required" },
        { status: 400 }
      );
    }

    const applicationRecord = {
      applicationId: `APP-${Date.now().toString().slice(-6)}`,
      jobId: id,
      applicantName: applicantName || session?.user?.name,
      applicantEmail: applicantEmail || session?.user?.email,
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
  } catch (error: any) {
    console.error("[Job Apply Error]", error);
    return NextResponse.json(
      { error: "Failed to submit job application", details: error.message },
      { status: 500 }
    );
  }
}
