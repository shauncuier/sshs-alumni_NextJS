import type { Mentor, MentorshipRequest } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import type { MentorProfile } from "@/lib/career-data";
import { sendEmail } from "@/lib/email";
import { can } from "@/lib/permissions";

/**
 * Alumni mentorship. Verified members apply to mentor; an admin approves them
 * before they are listed on /mentorship. Verified members send requests, which
 * the mentor accepts (sharing how and when to meet) or declines in
 * /mentorship/mine. Both sides are emailed; nothing is invented (no fake links,
 * no fake ratings).
 */

export const MENTOR_DOMAINS = [
  "BCS & Civil Service",
  "Medical & Surgery",
  "Software & AI",
  "Banking & Finance",
  "Higher Studies (US/EU)",
  "Corporate & HR",
] as const satisfies readonly MentorProfile["domain"][];
export const MENTOR_STATUSES = ["PENDING", "APPROVED", "REJECTED", "PAUSED"] as const;
export const REQUEST_STATUSES = ["PENDING", "ACCEPTED", "DECLINED", "CANCELLED"] as const;

type Actor = { id: string; email: string; role: string };
// Whoever may review mentors (admins and moderators, see lib/permissions.ts).
const isStaff = (role: string) => can(role, "mentors");
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const bad = (message: string) => new AppError("INVALID_MENTORSHIP", 400, message);
const jsonList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

function list(value: unknown, max: number): string[] {
  const items = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\n,]/) : [];
  return Array.from(new Set(items.map((v) => String(v).trim().slice(0, 80)).filter(Boolean))).slice(0, max);
}

const initialsAvatar = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=06281e&color=fcd34d&bold=true`;

export function toMentorProfile(m: Mentor & { _count?: { requests: number } }): MentorProfile {
  return {
    id: m.id,
    name: m.name,
    sscBatch: m.sscBatch ?? 0,
    designation: m.designation,
    organization: m.organization,
    domain: (MENTOR_DOMAINS as readonly string[]).includes(m.domain) ? (m.domain as MentorProfile["domain"]) : "Corporate & HR",
    locationCity: m.locationCity,
    avatarUrl: m.avatarUrl || initialsAvatar(m.name),
    bio: m.bio,
    yearsOfExperience: m.yearsOfExperience,
    availableDays: jsonList(m.availableDays),
    // Counts accepted requests only; there is no rating system, so no rating is shown.
    totalMenteesHelped: m._count?.requests ?? 0,
    rating: 0,
    skills: jsonList(m.skills),
    topicsOffered: jsonList(m.topicsOffered),
  };
}

const acceptedCount = { _count: { select: { requests: { where: { status: "ACCEPTED" } } } } } as const;

export async function listApprovedMentors(): Promise<MentorProfile[]> {
  const rows = await prisma.mentor.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "asc" }, include: acceptedCount });
  return rows.map(toMentorProfile);
}

export async function getOwnMentorProfile(userId: string): Promise<Mentor | null> {
  return prisma.mentor.findUnique({ where: { userId } });
}

async function requireVerified(actor: Actor, what: string) {
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { status: true, profile: { select: { fullName: true, sscBatch: true, avatarUrl: true, locationCity: true } } },
  });
  if (!user) throw new AppError("SIGN_IN_REQUIRED", 401, "Please sign in.");
  if (!isStaff(actor.role) && user.status !== "VERIFIED") throw new AppError("VERIFIED_MEMBERS_ONLY", 403, `Only verified members can ${what}.`);
  return user;
}

export interface MentorInput {
  designation?: unknown;
  organization?: unknown;
  domain?: unknown;
  locationCity?: unknown;
  bio?: unknown;
  yearsOfExperience?: unknown;
  availableDays?: unknown;
  skills?: unknown;
  topicsOffered?: unknown;
}

/**
 * Creates or updates the signed-in member's mentor profile. A new or previously
 * rejected profile goes (back) to PENDING for review; an approved one stays listed.
 */
export async function saveMentorProfile(actor: Actor, input: MentorInput): Promise<{ mentor: Mentor; created: boolean }> {
  const user = await requireVerified(actor, "become mentors");
  const designation = str(input.designation);
  const organization = str(input.organization);
  const bio = str(input.bio);
  if (designation.length < 2 || designation.length > 120) throw bad("Please enter your job title.");
  if (organization.length < 2 || organization.length > 200) throw bad("Please enter your organization.");
  if (!(MENTOR_DOMAINS as readonly string[]).includes(input.domain as string)) throw bad("Please choose your field.");
  if (bio.length < 40 || bio.length > 3000) throw bad("Please write a short bio (40 to 3000 characters).");
  const years = Number(input.yearsOfExperience);
  if (!Number.isInteger(years) || years < 0 || years > 60) throw bad("Please enter your years of experience.");
  const topicsOffered = list(input.topicsOffered, 8);
  if (topicsOffered.length === 0) throw bad("Please list at least one topic you can help with.");

  const data = {
    email: actor.email,
    name: user.profile?.fullName || actor.email.split("@")[0],
    sscBatch: user.profile?.sscBatch ?? null,
    avatarUrl: user.profile?.avatarUrl && user.profile.avatarUrl !== "/logo.png" ? user.profile.avatarUrl : null,
    designation,
    organization,
    domain: input.domain as string,
    locationCity: str(input.locationCity).slice(0, 120) || user.profile?.locationCity || "Chattogram",
    bio,
    yearsOfExperience: years,
    availableDays: list(input.availableDays, 7),
    skills: list(input.skills, 12),
    topicsOffered,
  };
  const existing = await prisma.mentor.findUnique({ where: { userId: actor.id } });
  if (!existing) {
    const mentor = await prisma.mentor.create({ data: { ...data, userId: actor.id, status: isStaff(actor.role) ? "APPROVED" : "PENDING" } });
    return { mentor, created: true };
  }
  const mentor = await prisma.mentor.update({
    where: { id: existing.id },
    data: { ...data, ...(existing.status === "REJECTED" ? { status: "PENDING", rejectReason: null } : {}) },
  });
  return { mentor, created: false };
}

/** Mentors pause or resume their own listing; admins approve, reject, pause or resume any mentor. */
export async function setMentorStatus(actor: Actor, mentorId: string, action: unknown, reason?: unknown, now = new Date()): Promise<Mentor> {
  const mentor = await prisma.mentor.findUnique({ where: { id: mentorId } });
  if (!mentor) throw new AppError("MENTOR_NOT_FOUND", 404, "Mentor not found.");
  const staff = isStaff(actor.role);
  const own = mentor.userId === actor.id;
  if (action === "PAUSE" || action === "RESUME") {
    if (!staff && !own) throw new AppError("FORBIDDEN", 403, "You can only change your own mentor profile.");
    if (action === "PAUSE" && mentor.status !== "APPROVED") throw new AppError("INVALID_STATE", 409, "Only a listed mentor can be paused.");
    if (action === "RESUME" && mentor.status !== "PAUSED") throw new AppError("INVALID_STATE", 409, "This profile is not paused.");
    return prisma.mentor.update({ where: { id: mentorId }, data: { status: action === "PAUSE" ? "PAUSED" : "APPROVED" } });
  }
  if (!staff) throw new AppError("FORBIDDEN", 403, "Only the committee can review mentors.");
  if (action === "APPROVE") {
    if (mentor.status === "APPROVED") throw new AppError("INVALID_STATE", 409, "This mentor is already approved.");
    return prisma.mentor.update({ where: { id: mentorId }, data: { status: "APPROVED", reviewedBy: actor.email, reviewedAt: now, rejectReason: null } });
  }
  if (action === "REJECT") {
    const why = str(reason);
    if (!why) throw bad("Please give a reason; the member will see it.");
    return prisma.mentor.update({ where: { id: mentorId }, data: { status: "REJECTED", reviewedBy: actor.email, reviewedAt: now, rejectReason: why.slice(0, 1000) } });
  }
  throw new AppError("INVALID_REQUEST", 400, "Unknown action.");
}

export async function listMentorsForAdmin(status?: string | null) {
  const where = status && (MENTOR_STATUSES as readonly string[]).includes(status) ? { status } : {};
  return prisma.mentor.findMany({ where, orderBy: [{ status: "asc" }, { createdAt: "desc" }], include: acceptedCount });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function email(to: string, replyTo: string, subject: string, lines: (string | null | undefined)[]): Promise<boolean> {
  const text = lines.filter(Boolean).join("\n");
  try {
    const sent = await sendEmail({
      to,
      replyTo,
      subject,
      text,
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;color:#0f172a">${text
        .split("\n")
        .map((l) => `<p style="margin:6px 0;white-space:pre-wrap">${escapeHtml(l)}</p>`)
        .join("")}</div>`,
    });
    return sent.success;
  } catch {
    return false;
  }
}

export interface RequestInput {
  mentorId?: unknown;
  topic?: unknown;
  preferredTime?: unknown;
  message?: unknown;
}

export async function createRequest(actor: Actor, input: RequestInput): Promise<{ request: MentorshipRequest; mentor: Mentor; emailed: boolean }> {
  const user = await requireVerified(actor, "request mentorship");
  const mentor = typeof input.mentorId === "string" ? await prisma.mentor.findUnique({ where: { id: input.mentorId } }) : null;
  if (!mentor || mentor.status !== "APPROVED") throw new AppError("MENTOR_NOT_FOUND", 404, "This mentor is not available.");
  if (mentor.userId === actor.id) throw bad("You cannot request mentorship from yourself.");
  const topic = str(input.topic).slice(0, 200);
  if (!topic) throw bad("Please choose a topic.");
  const message = str(input.message);
  if (message.length > 3000) throw bad("Keep your message to 3000 characters or fewer.");
  const open = await prisma.mentorshipRequest.findFirst({ where: { mentorId: mentor.id, menteeUserId: actor.id, status: "PENDING" }, select: { id: true } });
  if (open) throw new AppError("ALREADY_REQUESTED", 409, "You already have a request waiting for this mentor.");

  const name = user.profile?.fullName || actor.email.split("@")[0];
  const request = await prisma.mentorshipRequest.create({
    data: {
      mentorId: mentor.id,
      menteeUserId: actor.id,
      menteeName: name,
      menteeEmail: actor.email,
      menteeBatch: user.profile?.sscBatch ?? null,
      topic,
      preferredTime: str(input.preferredTime).slice(0, 120) || null,
      message: message || null,
    },
  });
  const emailed = await email(mentor.email, actor.email, `Mentorship request from ${name}`, [
    `${name}${request.menteeBatch ? ` (SSC ${request.menteeBatch})` : ""} asked for mentorship on: ${topic}`,
    request.preferredTime ? `Preferred time: ${request.preferredTime}` : null,
    request.message ? `\n${request.message}` : null,
    "\nAccept or decline it at /mentorship/mine.",
  ]);
  return { request, mentor, emailed };
}

/** The mentor accepts (with meeting details) or declines; the mentee may cancel a pending request. */
export async function respondToRequest(actor: Actor, requestId: string, action: unknown, input: { meetingDetails?: unknown; reply?: unknown }, now = new Date()) {
  const request = await prisma.mentorshipRequest.findUnique({ where: { id: requestId }, include: { mentor: true } });
  if (!request) throw new AppError("REQUEST_NOT_FOUND", 404, "Request not found.");
  if (request.status !== "PENDING") throw new AppError("ALREADY_DECIDED", 409, `This request is already ${request.status.toLowerCase()}.`);
  const reply = str(input.reply).slice(0, 2000) || null;

  if (action === "CANCEL") {
    if (request.menteeUserId !== actor.id) throw new AppError("FORBIDDEN", 403, "You can only cancel your own requests.");
    return prisma.mentorshipRequest.update({ where: { id: requestId }, data: { status: "CANCELLED", respondedAt: now } });
  }
  if (request.mentor.userId !== actor.id) throw new AppError("FORBIDDEN", 403, "Only the mentor can answer this request.");
  if (action === "ACCEPT") {
    const meetingDetails = str(input.meetingDetails);
    if (meetingDetails.length < 5) throw bad("Please say how and when you will meet (a meeting link, phone number or place and time).");
    const updated = await prisma.mentorshipRequest.update({ where: { id: requestId }, data: { status: "ACCEPTED", meetingDetails: meetingDetails.slice(0, 500), mentorReply: reply, respondedAt: now } });
    await email(request.menteeEmail, request.mentor.email, `${request.mentor.name} accepted your mentorship request`, [
      `${request.mentor.name} accepted your request about "${request.topic}".`,
      `How to meet: ${updated.meetingDetails}`,
      reply ? `\n${reply}` : null,
    ]);
    return updated;
  }
  if (action === "DECLINE") {
    const updated = await prisma.mentorshipRequest.update({ where: { id: requestId }, data: { status: "DECLINED", mentorReply: reply, respondedAt: now } });
    await email(request.menteeEmail, request.mentor.email, `Your mentorship request to ${request.mentor.name}`, [
      `${request.mentor.name} is not able to take your request about "${request.topic}" right now.`,
      reply ? `\n${reply}` : null,
    ]);
    return updated;
  }
  throw new AppError("INVALID_REQUEST", 400, "Unknown action.");
}

export async function listMyMentorship(userId: string) {
  const [mentor, sent] = await Promise.all([
    prisma.mentor.findUnique({ where: { userId }, include: { requests: { orderBy: { createdAt: "desc" } } } }),
    prisma.mentorshipRequest.findMany({ where: { menteeUserId: userId }, orderBy: { createdAt: "desc" }, include: { mentor: { select: { name: true, designation: true, organization: true } } } }),
  ]);
  return { mentor, sent };
}
