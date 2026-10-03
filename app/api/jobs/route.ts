/**
 * SSGHS Alumni — Careers & Jobs API
 * GET /api/jobs
 * POST /api/jobs
 */

import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/session-user";
import { sampleJobs, JobListing } from "@/lib/career-data";
import { requireRateLimit } from "@/lib/request-security";
import { AppError } from "@/lib/app-error";

// In-memory collection of dynamic jobs augmenting seed jobs (bounded to prevent memory exhaustion)
let jobsStore: JobListing[] = [...sampleJobs];

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("q")?.toLowerCase();
  const department = searchParams.get("department");
  const workplaceType = searchParams.get("workplace");

  let filtered = [...jobsStore];

  if (query) {
    filtered = filtered.filter(
      (j) =>
        j.title.toLowerCase().includes(query) ||
        j.company.toLowerCase().includes(query) ||
        j.description.toLowerCase().includes(query)
    );
  }

  if (department && department !== "ALL") {
    filtered = filtered.filter((j) => j.department.toLowerCase() === department.toLowerCase());
  }

  if (workplaceType && workplaceType !== "ALL") {
    filtered = filtered.filter((j) => j.workplaceType.toLowerCase() === workplaceType.toLowerCase());
  }

  return NextResponse.json({
    total: filtered.length,
    jobs: filtered,
  });
}

export async function POST(req: NextRequest) {
  try {
    requireRateLimit(req, "job-posting", { limit: 5, windowMs: 60 * 60_000 });

    const session = await getMemberSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized. You must be signed in as an alumnus to post a job." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      title,
      company,
      location,
      workplaceType,
      jobType,
      department,
      salaryRange,
      experienceLevel,
      description,
      requirements,
      benefits,
      deadline,
    } = body;

    if (!title || typeof title !== "string" || !title.trim() ||
        !company || typeof company !== "string" || !company.trim() ||
        !description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { error: "Title, company, and description are required" },
        { status: 400 }
      );
    }

    if (title.length > 150 || company.length > 150 || description.length > 5000) {
      return NextResponse.json(
        { error: "Input text exceeds maximum allowed length" },
        { status: 400 }
      );
    }

    const newJob: JobListing = {
      id: `job-${Date.now()}`,
      title: title.trim(),
      company: company.trim(),
      location: typeof location === "string" && location.trim() ? location.trim().slice(0, 100) : "Chattogram, Bangladesh",
      workplaceType: workplaceType || "On-site",
      jobType: jobType || "Full-time",
      department: typeof department === "string" && department.trim() ? department.trim().slice(0, 80) : "General",
      salaryRange: typeof salaryRange === "string" && salaryRange.trim() ? salaryRange.trim().slice(0, 60) : "Negotiable",
      experienceLevel: experienceLevel || "Mid Level",
      postedByAlumnus: {
        name: session.user.name || "SSGHS Alumnus",
        sscBatch: (session.user as unknown as { batchYear?: number })?.batchYear || 2008,
        designation: "Hiring Manager",
        avatarUrl: session.user.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
      },
      description: description.trim(),
      requirements: Array.isArray(requirements)
        ? requirements.map(r => String(r).slice(0, 200)).slice(0, 20)
        : String(requirements || "").split("\n").map(r => r.trim()).filter(Boolean).slice(0, 20),
      benefits: Array.isArray(benefits)
        ? benefits.map(b => String(b).slice(0, 200)).slice(0, 20)
        : String(benefits || "").split("\n").map(b => b.trim()).filter(Boolean).slice(0, 20),
      deadline: typeof deadline === "string" && deadline ? deadline.slice(0, 20) : "2026-11-30",
      applicationCount: 0,
      featured: false,
    };

    // Keep bounded in memory to prevent memory exhaustion
    jobsStore = [newJob, ...jobsStore.slice(0, 99)];

    return NextResponse.json({
      success: true,
      message: "Job posting published to SSGHS Alumni Career Network.",
      job: newJob,
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[Jobs API Error]", error);
    return NextResponse.json(
      { error: "Failed to publish job", details: (error as Error).message },
      { status: 500 }
    );
  }
}

