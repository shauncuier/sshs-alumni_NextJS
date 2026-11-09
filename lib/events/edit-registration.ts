import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { repostRegistrationFee } from "@/lib/finance/posting";
import { toAdminRegistration, WITH_USER } from "./admin";
import { computeFee, formatTaka, isChildGuestType, MAX_CHILD_GUEST_AGE, storedDiscountRule, storedGuests } from "./pricing";
import { eventFeeRules } from "./service";
import { ensureTokens } from "./tokens";
import type { AdminRegistration, GuestLine, GuestPerson } from "./types";

const MAX_AMOUNT = 1_000_000;

export interface RegistrationEdit {
  eventId: string;
  registrationId: string;
  adminEmail: string;
  packageName?: string | null;
  /** Guest counts by guest-type name. */
  guests?: Record<string, number> | null;
  /** Names (and children's ages) by guest-type name; optional, unlike on the online form. */
  guestPeople?: unknown;
  /** The amount actually paid, when it differs from the event's prices. */
  amountOverride?: unknown;
}

export interface RegistrationEditResult {
  registration: AdminRegistration;
  before: { packageName: string | null; guests: GuestLine[]; headCount: number; totalFee: number };
  after: { packageName: string | null; guests: GuestLine[]; headCount: number; totalFee: number };
}

function readAmount(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > MAX_AMOUNT) {
    throw new AppError("INVALID_AMOUNT", 400, "The amount paid must be a whole number of taka.");
  }
  return n;
}

/** The names typed for each guest, else the ones already stored; a guest without a name is fine here. */
function withPeople(lines: GuestLine[], raw: unknown, previous: GuestLine[]): GuestLine[] {
  const given = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  return lines.map((line) => {
    const list = given && Array.isArray(given[line.name]) ? (given[line.name] as unknown[]) : previous.find((p) => p.name === line.name)?.people ?? [];
    const child = isChildGuestType(line.name);
    const people: GuestPerson[] = [];
    for (let i = 0; i < line.count; i++) {
      const entry = list[i] && typeof list[i] === "object" ? (list[i] as Record<string, unknown>) : {};
      const name = typeof entry.name === "string" ? entry.name.trim().replace(/\s+/g, " ").slice(0, 100) : "";
      if (name.length < 2) continue;
      const age = entry.age === "" || entry.age === null || entry.age === undefined ? NaN : Number(entry.age);
      people.push(child && Number.isInteger(age) && age >= 0 && age <= MAX_CHILD_GUEST_AGE ? { name, age } : { name });
    }
    return people.length ? { ...line, people } : line;
  });
}

/**
 * The super admin corrects a registration the member filled in wrongly (e.g. paid for four
 * people but chose one): its package, guests and fee. The fee comes from the event's prices
 * unless the amount actually paid is given. On a paid registration the accounts are
 * corrected (old fee income voided, the new amount posted) and the food tokens follow the
 * new head count. The event's capacity is not checked: these people have already paid.
 */
export async function editRegistration(args: RegistrationEdit): Promise<RegistrationEditResult> {
  const override = readAmount(args.amountOverride);

  const { before, after } = await prisma.$transaction(async (tx) => {
    const reg = await tx.eventRegistration.findUnique({ where: { id: args.registrationId }, include: { event: true, discount: { select: { type: true, value: true } }, user: { include: { profile: { select: { sscBatch: true } } } } } });
    if (!reg || reg.eventId !== args.eventId) throw new AppError("REGISTRATION_NOT_FOUND", 404, "Registration not found.");
    if (reg.status === "CANCELLED") throw new AppError("INVALID_TRANSITION", 409, "This registration is cancelled.");

    const price = computeFee(
      eventFeeRules(reg.event),
      { packageName: args.packageName ?? null, guests: args.guests ?? {}, donationAmount: reg.donationAmount },
      { sscBatch: reg.user.profile?.sscBatch },
      // The discount the member registered with still applies to the corrected package.
      storedDiscountRule(reg)
    );
    const previous = storedGuests(reg);
    const guests = withPeople(price.guests, args.guestPeople, previous);
    const totalFee = override ?? price.fee;
    if (reg.event.isMembershipEvent && totalFee <= 0) {
      throw new AppError("MEMBERSHIP_MUST_BE_PAID", 400, "Membership registration requires a fee.");
    }

    const write = await tx.eventRegistration.updateMany({
      where: { id: reg.id, status: reg.status, updatedAt: reg.updatedAt },
      data: {
        packageName: price.pkg?.name ?? null,
        guests: guests as unknown as Prisma.InputJsonValue,
        extraAdults: price.extraAdults,
        extraChildren: price.extraChildren,
        headCount: price.headCount,
        guestCount: price.headCount,
        totalFee,
        // An amount typed by the admin is what was paid: no separate discount on the slip.
        discountAmount: override === null ? price.discount : 0,
      },
    });
    if (write.count === 0) throw new AppError("INVALID_TRANSITION", 409, "Another admin just changed this registration. Refresh and try again.");

    if (reg.status === "CONFIRMED" || reg.status === "CHECKED_IN") {
      if (totalFee !== reg.totalFee) {
        await repostRegistrationFee(tx, reg.id, `Registration corrected: ${formatTaka(reg.totalFee)} → ${formatTaka(totalFee)}`, args.adminEmail);
      }
      // Tokens are made when first printed; once they exist, they follow the head count.
      await tx.eventToken.deleteMany({ where: { registrationId: reg.id, usedAt: null, person: { gt: Math.max(1, price.headCount) } } });
      if ((await tx.eventToken.count({ where: { registrationId: reg.id } })) > 0) await ensureTokens(reg.id, tx);
    }

    return {
      before: { packageName: reg.packageName, guests: previous, headCount: reg.headCount, totalFee: reg.totalFee },
      after: { packageName: price.pkg?.name ?? null, guests, headCount: price.headCount, totalFee },
    };
  });

  const registration = toAdminRegistration(await prisma.eventRegistration.findUniqueOrThrow({ where: { id: args.registrationId }, include: WITH_USER }));
  return { registration, before, after };
}
