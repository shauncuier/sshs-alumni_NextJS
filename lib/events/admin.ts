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
    avatarUrl: reg.user.profile?.avatarUrl ?? null,
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
 *
 * Two admins can decide the same registration at the same time, so the actual
 * writes are guarded by the exact status/user-status this call just read
 * (`status: reg.status`, `status: "PENDING"`), not merely "one of the valid
 * starting states". `updateMany` + `count` turns that guard into part of the
 * write itself: MySQL re-checks the WHERE clause against the latest committed
 * row once a call that was blocked on the row lock wakes up, so a call that
 * raced against another admin's already-applied decision sees 0 rows affected
 * instead of silently overwriting it. That guarantees exactly one of two
 * concurrent decisions on the same registration succeeds — the loser gets a
 * 409 before it ever touches the member's account, profile or verification
 * request.
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
    const write = await tx.eventRegistration.updateMany({
      where: { id: reg.id, status: reg.status },
      data: {
        status: transition.to,
        ...(args.action === "APPROVE" ? { confirmedBy: args.adminEmail, confirmedAt: now } : {}),
        ...(args.action === "CHECK_IN" ? { checkedInAt: now } : {}),
        ...(args.action === "UNDO_CHECK_IN" ? { checkedInAt: null } : {}),
      },
    });
    if (write.count === 0) {
      throw new AppError("INVALID_TRANSITION", 409, "Another admin just changed this registration. Refresh and try again.");
    }

    if (reg.event.isMembershipEvent) {
      if (args.action === "APPROVE") {
        await tx.user.update({ where: { id: reg.userId }, data: { status: "VERIFIED" } });
        await tx.alumniProfile.updateMany({ where: { userId: reg.userId }, data: { verificationStatus: "VERIFIED" } });
        await tx.verificationRequest.updateMany({
          where: { userId: reg.userId, status: "PENDING" },
          data: { status: "VERIFIED", reviewedBy: args.adminEmail },
        });
      } else if (args.action === "CANCEL" && reg.user.status === "PENDING") {
        // Guarded the same way: only reject if the member is still PENDING at
        // write time, so a member another admin verified in the meantime (e.g.
        // via the same race above) is never downgraded.
        const rejected = await tx.user.updateMany({ where: { id: reg.userId, status: "PENDING" }, data: { status: "REJECTED" } });
        if (rejected.count === 1) {
          await tx.alumniProfile.updateMany({ where: { userId: reg.userId }, data: { verificationStatus: "REJECTED" } });
          await tx.verificationRequest.updateMany({
            where: { userId: reg.userId, status: "PENDING" },
            data: { status: "REJECTED", reviewedBy: args.adminEmail },
          });
        }
      }
    }

    return tx.eventRegistration.findUniqueOrThrow({
      where: { id: reg.id },
      include: { user: { include: { profile: true } } },
    });
  });
  return toAdminRegistration(updated);
}
