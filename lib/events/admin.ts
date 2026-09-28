import type { AlumniProfile, EventRegistration, User } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { getPublicEventBySlug } from "./service";
import type { AdminRegistration, PublicEvent, RegistrationStatusValue } from "./types";

type RegWithUser = EventRegistration & { user: User & { profile: AlumniProfile | null } };

function toAdminRegistration(reg: RegWithUser): AdminRegistration {
  return {
    id: reg.id,
    userId: reg.userId,
    name: reg.user.profile?.fullName ?? reg.user.email,
    email: reg.user.email,
    phone: reg.user.profile?.phone ?? "",
    batch: reg.user.profile?.sscBatch ?? null,
    rollNumber: reg.user.profile?.rollNumber ?? null,
    section: reg.user.profile?.section ?? null,
    membershipStatus: reg.user.status,
    packageName: reg.packageName,
    extraAdults: reg.extraAdults,
    extraChildren: reg.extraChildren,
    headCount: reg.headCount,
    totalFee: reg.totalFee,
    donationAmount: reg.donationAmount,
    tshirtSize: reg.tshirtSize,
    mealPreference: reg.mealPreference,
    paymentMethod: reg.paymentMethod,
    transactionId: reg.transactionId,
    status: reg.status,
    confirmedBy: reg.confirmedBy,
    confirmedAt: reg.confirmedAt?.toISOString() ?? null,
    checkedInAt: reg.checkedInAt?.toISOString() ?? null,
    createdAt: reg.createdAt.toISOString(),
  };
}

export async function getAdminEvent(id: string): Promise<{
  event: PublicEvent;
  registrations: AdminRegistration[];
  totals: { confirmedRevenue: number; pendingRevenue: number; confirmedDonations: number; headCount: number };
}> {
  const row = await prisma.event.findUnique({ where: { id }, select: { slug: true } });
  const event = row ? await getPublicEventBySlug(row.slug) : null;
  if (!event) throw new AppError("EVENT_NOT_FOUND", 404, "Event not found.");

  const regs = await prisma.eventRegistration.findMany({
    where: { eventId: id },
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
  });
  const registrations = regs.map(toAdminRegistration);
  const paid = (r: AdminRegistration) => r.totalFee + r.donationAmount;
  const attending = registrations.filter((r) => r.status === "CONFIRMED" || r.status === "CHECKED_IN");
  return {
    event,
    registrations,
    totals: {
      confirmedRevenue: attending.reduce((s, r) => s + paid(r), 0),
      confirmedDonations: attending.reduce((s, r) => s + r.donationAmount, 0),
      pendingRevenue: registrations.filter((r) => r.status === "PENDING_PAYMENT").reduce((s, r) => s + paid(r), 0),
      headCount: attending.reduce((s, r) => s + r.headCount, 0),
    },
  };
}

type Action = "APPROVE" | "CANCEL" | "CHECK_IN" | "UNDO_CHECK_IN";

const TRANSITIONS: Record<Action, { from: RegistrationStatusValue[]; to: RegistrationStatusValue }> = {
  APPROVE: { from: ["PENDING_PAYMENT"], to: "CONFIRMED" },
  CANCEL: { from: ["PENDING_PAYMENT", "CONFIRMED"], to: "CANCELLED" },
  CHECK_IN: { from: ["CONFIRMED"], to: "CHECKED_IN" },
  UNDO_CHECK_IN: { from: ["CHECKED_IN"], to: "CONFIRMED" },
};

/**
 * Admin decisions on a registration. On the membership event, APPROVE also
 * verifies the member and CANCEL rejects a member who is still PENDING, all in
 * one transaction; an already-verified member is never rejected.
 */
export async function decideRegistration(args: {
  eventId: string;
  registrationId: string;
  action: Action;
  adminEmail: string;
}): Promise<AdminRegistration> {
  const transition = TRANSITIONS[args.action];
  if (!transition) throw new AppError("INVALID_ACTION", 400, "Unknown action.");

  const updated = await prisma.$transaction(async (tx) => {
    const reg = await tx.eventRegistration.findUnique({ where: { id: args.registrationId }, include: { event: true, user: true } });
    if (!reg || reg.eventId !== args.eventId) throw new AppError("REGISTRATION_NOT_FOUND", 404, "Registration not found.");
    if (!transition.from.includes(reg.status)) {
      throw new AppError("INVALID_TRANSITION", 409, `This registration is ${reg.status.toLowerCase().replace("_", " ")}.`);
    }

    const now = new Date();
    await tx.eventRegistration.update({
      where: { id: reg.id },
      data: {
        status: transition.to,
        ...(args.action === "APPROVE" ? { confirmedBy: args.adminEmail, confirmedAt: now } : {}),
        ...(args.action === "CHECK_IN" ? { checkedInAt: now } : {}),
        ...(args.action === "UNDO_CHECK_IN" ? { checkedInAt: null } : {}),
      },
    });

    if (reg.event.isMembershipEvent) {
      const membership =
        args.action === "APPROVE" ? "VERIFIED" : args.action === "CANCEL" && reg.user.status === "PENDING" ? "REJECTED" : null;
      if (membership) {
        await tx.user.update({ where: { id: reg.userId }, data: { status: membership } });
        await tx.alumniProfile.updateMany({ where: { userId: reg.userId }, data: { verificationStatus: membership } });
        await tx.verificationRequest.updateMany({
          where: { userId: reg.userId, status: "PENDING" },
          data: { status: membership, reviewedBy: args.adminEmail },
        });
      }
    }

    return tx.eventRegistration.findUniqueOrThrow({
      where: { id: reg.id },
      include: { user: { include: { profile: true } } },
    });
  });
  return toAdminRegistration(updated);
}
