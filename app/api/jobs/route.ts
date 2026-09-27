/**
 * SSGHS Alumni — Careers & Jobs API
 * GET /api/jobs
 * POST /api/jobs
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sampleJobs, JobListing } from "@/lib/career-data";

// In-memory collection of dynamic jobs augmenting seed jobs
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
    const session = await getServerSession(authOptions);
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

    if (!title || !company || !description) {
      return NextResponse.json(
        { error: "Title, company, and description are required" },
        { status: 400 }
      );
    }

    const newJob: JobListing = {
      id: `job-${Date.now()}`,
      title,
      company,
      location: location || "Chattogram, Bangladesh",
      workplaceType: workplaceType || "On-site",
      jobType: jobType || "Full-time",
      department: department || "General",
      salaryRange: salaryRange || "Negotiable",
      experienceLevel: experienceLevel || "Mid Level",
      postedByAlumnus: {
        name: session?.user?.name || "SSGHS Alumnus",
        sscBatch: session?.user?.batchYear || 2008,
        designation: "Hiring Manager",
        avatarUrl: session?.user?.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
      },
      description,
      requirements: Array.isArray(requirements)
        ? requirements
        : String(requirements || "").split("\n").filter(Boolean),
      benefits: Array.isArray(benefits)
        ? benefits
        : String(benefits || "").split("\n").filter(Boolean),
      deadline: deadline || "2026-11-30",
      applicationCount: 0,
      featured: false,
    };

    jobsStore = [newJob, ...jobsStore];

    return NextResponse.json({
      success: true,
      message: "Job posting published to SSGHS Alumni Career Network.",
      job: newJob,
    });
  } catch (error: unknown) {
    console.error("[Jobs API Error]", error);
    return NextResponse.json(
      { error: "Failed to publish job", details: (error as Error).message },
      { status: 500 }
    );
  }
}
