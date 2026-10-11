import type { Volunteer } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import type { VolunteerItem } from "./volunteers-types";
import { SUBCOMMITTEES, SUBCOMMITTEE_LABELS } from "./volunteers-types";

export type { VolunteerItem };
export { SUBCOMMITTEES, SUBCOMMITTEE_LABELS };

/**
 * Volunteer applications for event subcommittees, stored in the Volunteer table.
 * Applications come from /volunteer and from the event registration form; the
 * committee approves or declines them in /admin/volunteers.
 */

export const VOLUNTEER_STATUSES = ["PENDING", "APPROVED", "DECLINED"] as const;
export type VolunteerStatus = (typeof VOLUNTEER_STATUSES)[number];

export function isSubcommittee(value: unknown): value is string {
  return typeof value === "string" && SUBCOMMITTEES.some((s) => s.id === value);
}

function toItem(v: Volunteer): VolunteerItem {
  return {
    id: v.id,
    fullName: v.fullName,
    email: v.email,
    phone: v.phone,
    sscBatch: v.sscBatch,
    subcommittee: v.subcommittee,
    subcommitteeLabel: SUBCOMMITTEE_LABELS[v.subcommittee] || v.subcommittee,
    skills: v.skills ?? undefined,
    availability: v.availability ?? undefined,
    experience: v.experience ?? undefined,
    notes: v.notes ?? undefined,
    source: v.source === "EVENT_REGISTRATION" ? "EVENT_REGISTRATION" : "PUBLIC_APPLICATION",
    status: (VOLUNTEER_STATUSES as readonly string[]).includes(v.status) ? (v.status as VolunteerStatus) : "PENDING",
    appliedAt: v.appliedAt.toISOString(),
  };
}

export async function getVolunteers(filterStatus?: string): Promise<VolunteerItem[]> {
  const where = filterStatus && (VOLUNTEER_STATUSES as readonly string[]).includes(filterStatus) ? { status: filterStatus } : {};
  const rows = await prisma.volunteer.findMany({ where, orderBy: { appliedAt: "desc" } });
  return rows.map(toItem);
}

const cut = (value: string | undefined, max: number) => {
  const v = value?.trim();
  return v ? v.slice(0, max) : null;
};

export async function createVolunteer(input: {
  fullName: string;
  email: string;
  phone: string;
  sscBatch: number;
  subcommittee: string;
  skills?: string;
  availability?: string;
  experience?: string;
  notes?: string;
  source?: "PUBLIC_APPLICATION" | "EVENT_REGISTRATION";
  userId?: string | null;
}): Promise<VolunteerItem> {
  if (!isSubcommittee(input.subcommittee)) throw new AppError("INVALID_SUBCOMMITTEE", 400, "Please select a subcommittee.");
  const email = input.email.trim().toLowerCase().slice(0, 254);
  // One open application per person and subcommittee; a declined one may apply again.
  const existing = await prisma.volunteer.findFirst({
    where: { email, subcommittee: input.subcommittee, status: { in: ["PENDING", "APPROVED"] } },
    select: { status: true },
  });
  if (existing) {
    throw new AppError(
      "ALREADY_APPLIED",
      409,
      existing.status === "APPROVED" ? "You are already a volunteer in this subcommittee." : "You have already applied to this subcommittee; the committee will contact you."
    );
  }
  const row = await prisma.volunteer.create({
    data: {
      fullName: input.fullName.trim().slice(0, 120),
      email,
      phone: input.phone.trim().slice(0, 30),
      sscBatch: input.sscBatch,
      subcommittee: input.subcommittee,
      skills: cut(input.skills, 2000),
      availability: cut(input.availability, 200) ?? "Anytime needed",
      experience: cut(input.experience, 2000),
      notes: cut(input.notes, 2000),
      source: input.source || "PUBLIC_APPLICATION",
      userId: input.userId ?? null,
    },
  });
  return toItem(row);
}

export async function updateVolunteerStatus(
  id: string,
  status: VolunteerStatus,
  subcommittee?: string,
  decidedBy?: string
): Promise<VolunteerItem | null> {
  if (subcommittee && !isSubcommittee(subcommittee)) throw new AppError("INVALID_SUBCOMMITTEE", 400, "Unknown subcommittee.");
  const found = await prisma.volunteer.findUnique({ where: { id }, select: { id: true } });
  if (!found) return null;
  const row = await prisma.volunteer.update({
    where: { id },
    data: {
      status,
      ...(subcommittee ? { subcommittee } : {}),
      decidedBy: decidedBy ?? null,
      decidedAt: status === "PENDING" ? null : new Date(),
    },
  });
  return toItem(row);
}
