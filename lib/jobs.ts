import { Prisma, type Job, type JobApplication } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import type { JobListing } from "@/lib/career-data";
import { sendEmail } from "@/lib/email";

/**
 * The alumni job board. Verified members post jobs; an admin approves each one
 * before it appears on /careers (admins' own posts go live at once). Applications
 * are stored and emailed to the poster, who also sees them in /careers/mine.
 * A job stops taking applications after its deadline.
 */

export const WORKPLACE_TYPES = ["On-site", "Hybrid", "Remote"] as const;
export const JOB_TYPES = ["Full-time", "Part-time", "Internship", "Contract"] as const;
export const EXPERIENCE_LEVELS = ["Entry Level", "Mid Level", "Senior Level", "Executive"] as const;
export const JOB_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CLOSED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

type Actor = { id: string; email: string; role: string };
const isStaff = (role: string) => role === "ADMIN" || role === "SUPER_ADMIN";
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const bad = (message: string) => new AppError("INVALID_JOB", 400, message);
const DAY_MS = 24 * 60 * 60_000;

/** End of the deadline day in Bangladesh (UTC+6), so a job is open all of its last day. */
function deadlineEnd(dateOnly: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  const d = new Date(`${dateOnly}T23:59:59+06:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const toDateOnly = (d: Date) => new Date(d.getTime() + 6 * 60 * 60_000).toISOString().slice(0, 10);

function list(value: unknown): string[] {
  const items = Array.isArray(value) ? value : typeof value === "string" ? value.split("\n") : [];
  return items.map((v) => String(v).trim().slice(0, 200)).filter(Boolean).slice(0, 20);
}

const initialsAvatar = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=06281e&color=fcd34d&bold=true`;

export function isOpen(job: Pick<Job, "status" | "deadline">, now = new Date()): boolean {
  return job.status === "APPROVED" && job.deadline.getTime() >= now.getTime();
}

export function toJobListing(job: Job & { _count?: { applications: number } }): JobListing {
  const pick = <T extends readonly string[]>(options: T, value: string, fallback: T[number]) =>
    ((options as readonly string[]).includes(value) ? value : fallback) as T[number];
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    workplaceType: pick(WORKPLACE_TYPES, job.workplaceType, "On-site"),
    jobType: pick(JOB_TYPES, job.jobType, "Full-time"),
    department: job.department,
    salaryRange: job.salaryRange || "Negotiable",
    experienceLevel: pick(EXPERIENCE_LEVELS, job.experienceLevel, "Mid Level"),
    postedByAlumnus: {
      name: job.postedByName,
      sscBatch: job.postedByBatch ?? 0,
      designation: "SSGHS Alumnus",
      avatarUrl: initialsAvatar(job.postedByName),
    },
    description: job.description,
    requirements: Array.isArray(job.requirements) ? (job.requirements as string[]) : [],
    benefits: Array.isArray(job.benefits) ? (job.benefits as string[]) : [],
    deadline: toDateOnly(job.deadline),
    applicationCount: job._count?.applications ?? 0,
  };
}

/** Approved jobs still taking applications, newest first. */
export async function listOpenJobs(now = new Date()): Promise<JobListing[]> {
  const rows = await prisma.job.findMany({
    where: { status: "APPROVED", deadline: { gte: now } },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { applications: true } } },
  });
  return rows.map(toJobListing);
}

/** An approved job (open or past its deadline), or null for anything not public. */
export async function getPublicJob(id: string, now = new Date()): Promise<{ job: JobListing; open: boolean } | null> {
  const row = await prisma.job.findFirst({ where: { id, status: { in: ["APPROVED", "CLOSED"] } }, include: { _count: { select: { applications: true } } } });
  return row ? { job: toJobListing(row), open: isOpen(row, now) } : null;
}

export interface JobInput {
  title?: unknown;
  company?: unknown;
  location?: unknown;
  workplaceType?: unknown;
  jobType?: unknown;
  department?: unknown;
  salaryRange?: unknown;
  experienceLevel?: unknown;
  description?: unknown;
  requirements?: unknown;
  benefits?: unknown;
  deadline?: unknown;
}

export async function createJob(actor: Actor, input: JobInput, now = new Date()): Promise<Job> {
  const user = await prisma.user.findUnique({ where: { id: actor.id }, select: { status: true, profile: { select: { fullName: true, sscBatch: true } } } });
  if (!user) throw new AppError("SIGN_IN_REQUIRED", 401, "Please sign in to post a job.");
  if (!isStaff(actor.role) && user.status !== "VERIFIED") {
    throw new AppError("VERIFIED_MEMBERS_ONLY", 403, "Only verified members can post jobs.");
  }

  const title = str(input.title);
  const company = str(input.company);
  const description = str(input.description);
  if (title.length < 3 || title.length > 200) throw bad("The job title must be 3 to 200 characters.");
  if (company.length < 2 || company.length > 200) throw bad("Please enter the company or organization.");
  if (description.length < 30 || description.length > 20_000) throw bad("Please describe the role (at least a couple of sentences).");
  for (const [value, options, name] of [
    [input.workplaceType, WORKPLACE_TYPES, "workplace type"],
    [input.jobType, JOB_TYPES, "job type"],
    [input.experienceLevel, EXPERIENCE_LEVELS, "experience level"],
  ] as const) {
    if (!(options as readonly string[]).includes(value as string)) throw bad(`Please choose the ${name}.`);
  }
  const deadline = deadlineEnd(str(input.deadline));
  if (!deadline) throw bad("Please choose an application deadline.");
  if (deadline.getTime() < now.getTime()) throw bad("The deadline must be today or later.");
  if (deadline.getTime() > now.getTime() + 365 * DAY_MS) throw bad("The deadline can be at most a year away.");

  return prisma.job.create({
    data: {
      title,
      company,
      location: str(input.location).slice(0, 120) || "Chattogram, Bangladesh",
      workplaceType: input.workplaceType as string,
      jobType: input.jobType as string,
      department: str(input.department).slice(0, 80) || "General",
      salaryRange: str(input.salaryRange).slice(0, 80) || null,
      experienceLevel: input.experienceLevel as string,
      description,
      requirements: list(input.requirements),
      benefits: list(input.benefits),
      deadline,
      // Admins moderate the board, so their own posts need no review.
      status: isStaff(actor.role) ? "APPROVED" : "PENDING",
      reviewedBy: isStaff(actor.role) ? actor.email : null,
      reviewedAt: isStaff(actor.role) ? now : null,
      postedById: actor.id,
      postedByEmail: actor.email,
      postedByName: user.profile?.fullName || actor.email.split("@")[0],
      postedByBatch: user.profile?.sscBatch ?? null,
    },
  });
}

export interface ApplicationInput {
  applicantName?: unknown;
  applicantEmail?: unknown;
  applicantPhone?: unknown;
  applicantBatch?: unknown;
  resumeUrl?: unknown;
  coverNote?: unknown;
}

export async function applyToJob(jobId: string, input: ApplicationInput, applicantUserId: string | null, now = new Date()): Promise<{ application: JobApplication; job: Job }> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || (job.status !== "APPROVED" && job.status !== "CLOSED")) throw new AppError("JOB_NOT_FOUND", 404, "This job is not available.");
  if (!isOpen(job, now)) throw new AppError("JOB_CLOSED", 409, "This job is no longer taking applications.");

  const name = str(input.applicantName).slice(0, 120);
  const email = str(input.applicantEmail).toLowerCase().slice(0, 254);
  if (!name) throw bad("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad("Please enter a valid email address.");
  const resumeUrl = str(input.resumeUrl);
  if (resumeUrl && (!/^https:\/\/\S+$/i.test(resumeUrl) || resumeUrl.length > 500)) {
    throw bad("The CV link must be a full https:// link (e.g. Google Drive or LinkedIn).");
  }
  const coverNote = str(input.coverNote);
  if (coverNote.length > 5000) throw bad("Keep the note to 5000 characters or fewer.");
  const batch = Number(input.applicantBatch);

  try {
    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        applicantUserId,
        name,
        email,
        phone: str(input.applicantPhone).slice(0, 30) || null,
        sscBatch: Number.isInteger(batch) && batch >= 1950 && batch <= now.getFullYear() ? batch : null,
        resumeUrl: resumeUrl || null,
        coverNote: coverNote || null,
      },
    });
    return { application, job };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError("ALREADY_APPLIED", 409, "You have already applied for this job.");
    }
    throw err;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Emails the poster about a new application (Reply-To: the applicant). Never throws. */
export async function notifyPoster(job: Job, a: JobApplication): Promise<boolean> {
  const lines = [
    `${a.name} applied for "${job.title}" at ${job.company}.`,
    `Email: ${a.email}`,
    a.phone ? `Phone: ${a.phone}` : null,
    a.sscBatch ? `SSC batch: ${a.sscBatch}` : null,
    a.resumeUrl ? `CV: ${a.resumeUrl}` : null,
    a.coverNote ? `\n${a.coverNote}` : null,
    "\nAll applications for your jobs: /careers/mine",
  ].filter(Boolean) as string[];
  try {
    const sent = await sendEmail({
      to: job.postedByEmail,
      replyTo: a.email,
      subject: `New application: ${job.title}`,
      text: lines.join("\n"),
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;color:#0f172a">${lines
        .map((l) => `<p style="margin:6px 0;white-space:pre-wrap">${escapeHtml(l)}</p>`)
        .join("")}</div>`,
    });
    return sent.success;
  } catch {
    return false;
  }
}

export type JobWithApplications = Job & { applications: JobApplication[] };

export async function listJobsByPoster(userId: string): Promise<JobWithApplications[]> {
  return prisma.job.findMany({ where: { postedById: userId }, orderBy: { createdAt: "desc" }, include: { applications: { orderBy: { createdAt: "desc" } } } });
}

export async function listJobsForAdmin(status?: string | null) {
  const where = status && (JOB_STATUSES as readonly string[]).includes(status) ? { status } : {};
  return prisma.job.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { applications: true } } },
  });
}

/**
 * Admins approve, reject (with a reason) or close any job; the poster may close
 * their own job. Rejected and closed jobs never return to the board.
 */
export async function decideJob(actor: Actor, jobId: string, action: unknown, reason?: unknown, now = new Date()): Promise<Job> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new AppError("JOB_NOT_FOUND", 404, "Job not found.");
  const staff = isStaff(actor.role);
  if (action === "CLOSE") {
    if (!staff && job.postedById !== actor.id) throw new AppError("FORBIDDEN", 403, "You can only close your own jobs.");
    if (job.status === "CLOSED" || job.status === "REJECTED") throw new AppError("ALREADY_DECIDED", 409, "This job is already closed.");
    return prisma.job.update({ where: { id: jobId }, data: { status: "CLOSED" } });
  }
  if (!staff) throw new AppError("FORBIDDEN", 403, "Only administrators can review jobs.");
  if (action === "APPROVE") {
    if (job.status !== "PENDING") throw new AppError("ALREADY_DECIDED", 409, `This job is already ${job.status.toLowerCase()}.`);
    return prisma.job.update({ where: { id: jobId }, data: { status: "APPROVED", reviewedBy: actor.email, reviewedAt: now, rejectReason: null } });
  }
  if (action === "REJECT") {
    const why = str(reason);
    if (!why) throw bad("Please give a reason; the member will see it.");
    if (job.status !== "PENDING" && job.status !== "APPROVED") throw new AppError("ALREADY_DECIDED", 409, `This job is already ${job.status.toLowerCase()}.`);
    return prisma.job.update({ where: { id: jobId }, data: { status: "REJECTED", reviewedBy: actor.email, reviewedAt: now, rejectReason: why.slice(0, 1000) } });
  }
  throw new AppError("INVALID_REQUEST", 400, "Unknown action.");
}

export async function deleteJob(actor: Actor, jobId: string): Promise<Job> {
  if (!isStaff(actor.role)) throw new AppError("FORBIDDEN", 403, "Only administrators can delete jobs.");
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new AppError("JOB_NOT_FOUND", 404, "Job not found.");
  await prisma.job.delete({ where: { id: jobId } });
  return job;
}
