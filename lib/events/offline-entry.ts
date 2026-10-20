import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { createMemberAccount, hashMemberPassword } from "@/lib/members/create-member";
import { processAvatar, removeAvatarDir, saveAvatar } from "@/lib/media/avatars";
import { isProofType, proofTypeLabel } from "@/lib/members/proof-types";
import { canonicalPhone, isPhoneClash, PHONE_TAKEN_MESSAGE, requirePhoneFree } from "@/lib/phone-registry";
import { emailMembershipDecision, emailRegistration } from "@/lib/member-emails";
import { smsRegistrationConfirmed } from "@/lib/member-sms";
import { CLOSED_MESSAGES } from "./availability";
import { computeFee } from "./pricing";
import { eventFeeRules } from "./service";
import { OFFLINE_SOURCE } from "./types";

/**
 * Paper registration forms, typed in by a committee member. The committee has the
 * form, the money and a photocopy of the proof in hand, so unlike the online join:
 * - no SMS code (the member is not there to read it); the number must still be free,
 * - the proof is the paper copy: the committee ticks which document it checked,
 *   no upload,
 * - the photo is optional (the paper form has one pasted on),
 * - email is optional; without one the account gets a placeholder address that
 *   never receives mail, and the member is told by SMS,
 * - the member is approved and the registration confirmed at once.
 */

/** Placeholder addresses end in this reserved domain (RFC 2606), so mail to them is never sent. */
export const NO_EMAIL_DOMAIN = "no-email.ssghs.invalid";
export const isPlaceholderEmail = (email: string | null | undefined) => Boolean(email?.toLowerCase().endsWith(`@${NO_EMAIL_DOMAIN}`));

export const OFFLINE_PAYMENT_METHODS = ["Cash", "Bangla QR"] as const;

export interface OfflineEntryInput {
  eventId: string;
  staff: { id?: string | null; email: string };
  member: {
    fullName: string;
    email?: string | null;
    phone: string;
    sscBatch: number | string;
    rollNumber?: string | null;
    section?: string | null;
    bloodGroup?: string | null;
    profession?: string | null;
    designation?: string | null;
    company?: string | null;
    address?: string | null;
  };
  /** Which paper document the committee checked (one of PROOF_TYPES). */
  proofType: string;
  photo?: Buffer;
  guests?: Record<string, number> | null;
  tshirtSize?: string | null;
  paymentMethod: string;
  /** Required for Bangla QR; none for cash. */
  transactionId?: string | null;
  formNo?: string | null;
  receiptNo?: string | null;
  now?: Date;
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function enterOfflineRegistration(input: OfflineEntryInput): Promise<{ registrationId: string; userId: string; email: string; totalFee: number }> {
  const now = input.now ?? new Date();
  const m = input.member;
  const fullName = text(m.fullName, 120);
  if (!fullName) throw new AppError("INVALID_ACCOUNT", 400, "Please type the member's name.");
  const phone = canonicalPhone(m.phone);
  const typedEmail = text(m.email, 191).toLowerCase();
  if (typedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typedEmail)) {
    throw new AppError("INVALID_ACCOUNT", 400, "That email address does not look right. Leave it empty if the member has none.");
  }
  const email = typedEmail || `${phone}@${NO_EMAIL_DOMAIN}`;
  if (!isProofType(input.proofType)) {
    throw new AppError("INVALID_PROOF", 400, "Tick the document you checked: SSC certificate, testimonial or marksheet.");
  }
  if (!(OFFLINE_PAYMENT_METHODS as readonly string[]).includes(input.paymentMethod)) {
    throw new AppError("PAYMENT_REQUIRED", 400, "Choose how the member paid: cash or Bangla QR.");
  }
  const transactionId = (input.transactionId ?? "").replace(/\s+/g, "").toUpperCase();
  if (input.paymentMethod === "Bangla QR" && !/^[A-Z0-9-]{6,40}$/.test(transactionId)) {
    throw new AppError("PAYMENT_REQUIRED", 400, "Type the Bangla QR transaction ID from the form (6–40 letters or numbers).");
  }
  const formNo = text(input.formNo, 30);
  const receiptNo = text(input.receiptNo, 30);

  // The member never types a password here; they can set one later with "Forgot password".
  const randomPassword = randomBytes(24).toString("base64url");
  const passwordHash = await hashMemberPassword(randomPassword);

  let photoDir: string | null = null;
  let avatar: { avatarUrl: string; originalUrl: string } | null = null;
  if (input.photo) {
    const saved = await saveAvatar(await processAvatar(input.photo));
    photoDir = saved.dir;
    avatar = { avatarUrl: saved.avatarUrl, originalUrl: saved.originalUrl };
  }

  const proofNote = `Paper form${formNo ? ` no. ${formNo}` : ""}: ${proofTypeLabel(input.proofType)} photocopy checked by ${input.staff.email}`;
  const notes = [
    `[Offline form${formNo ? ` no. ${formNo}` : ""}${receiptNo ? `, receipt no. ${receiptNo}` : ""}, entered by ${input.staff.email}]`,
  ].join("\n");

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM \`Event\` WHERE id = ${input.eventId} FOR UPDATE`;
        if (locked.length === 0) throw new AppError("EVENT_NOT_FOUND", 404, "Event not found.");
        const event = await tx.event.findUniqueOrThrow({ where: { id: input.eventId } });
        if (!event.isMembershipEvent) {
          throw new AppError("NOT_MEMBERSHIP_EVENT", 400, "Paper forms are only for the membership (Golden Jubilee) registration.");
        }

        await requirePhoneFree(phone, { db: tx });
        const created = await createMemberAccount(
          tx,
          {
            fullName,
            email,
            phone,
            password: randomPassword, // never shown to anyone; the member resets it to sign in
            sscBatch: m.sscBatch,
            rollNumber: m.rollNumber,
            section: m.section,
            bloodGroup: m.bloodGroup,
            profession: m.profession,
            designation: m.designation,
            company: m.company,
            address: m.address,
            avatarUrl: avatar?.avatarUrl ?? null,
            avatarOriginalUrl: avatar?.originalUrl ?? null,
            proofType: input.proofType,
            proofNote,
          },
          passwordHash
        );

        const reserved = await tx.eventRegistration.aggregate({
          where: { eventId: event.id, status: { in: ["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN"] } },
          _sum: { headCount: true },
        });
        const reservedHeads = reserved._sum.headCount ?? 0;
        const rules = eventFeeRules(event);
        // The paper form was filled in while registration was open, so a closed form or a
        // passed deadline does not stop it here; only a full event does.
        const price = computeFee(rules, { guests: input.guests ?? null }, { sscBatch: Number(m.sscBatch) });
        if (reservedHeads + price.headCount > event.maxAttendees) {
          throw new AppError("REGISTRATION_CLOSED", 409, CLOSED_MESSAGES.FULL);
        }
        if (transactionId) {
          const usedByDonation = await tx.donation.findFirst({ where: { transactionRef: transactionId, paymentStatus: { not: "FAILED" } }, select: { id: true } });
          if (usedByDonation || (await tx.eventRegistration.findUnique({ where: { transactionId }, select: { id: true } }))) {
            throw new AppError("DUPLICATE_TRANSACTION", 409, "This transaction ID has already been used for a registration.");
          }
        }

        const registration = await tx.eventRegistration.create({
          data: {
            eventId: event.id,
            userId: created.id,
            packageName: price.pkg?.name ?? null,
            extraAdults: price.extraAdults,
            extraChildren: price.extraChildren,
            guests: price.guests as unknown as Prisma.InputJsonValue,
            source: OFFLINE_SOURCE,
            headCount: price.headCount,
            guestCount: price.headCount,
            totalFee: price.fee,
            donationAmount: price.donation,
            tshirtSize: text(input.tshirtSize, 10) || null,
            notes,
            paymentMethod: input.paymentMethod,
            transactionId: transactionId || null,
            status: "CONFIRMED",
            confirmedBy: input.staff.email,
            confirmedAt: now,
          },
          select: { id: true, totalFee: true },
        });

        // The committee checked the paper proof and took the money: approved now.
        await tx.user.update({ where: { id: created.id }, data: { status: "VERIFIED" } });
        await tx.alumniProfile.updateMany({ where: { userId: created.id }, data: { verificationStatus: "VERIFIED" } });
        await tx.verificationRequest.updateMany({ where: { userId: created.id }, data: { status: "VERIFIED", reviewedBy: input.staff.email } });

        return { registrationId: registration.id, userId: created.id, totalFee: registration.totalFee };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 }
    );

    // Tell the member; never fails the entry. No mail to a placeholder address.
    if (!isPlaceholderEmail(email)) {
      await emailMembershipDecision(result.userId, "VERIFIED");
      await emailRegistration(result.registrationId, "confirmed");
    }
    await smsRegistrationConfirmed(result.registrationId);
    return { ...result, email };
  } catch (err) {
    if (photoDir) await removeAvatarDir(photoDir);
    if (err instanceof AppError && err.code === "EMAIL_EXISTS") {
      throw new AppError("EMAIL_EXISTS", 409, "This email already has an account. Search for the member in Admin › Alumni instead, or leave the email empty.");
    }
    if (isPhoneClash(err)) throw new AppError("PHONE_TAKEN", 409, PHONE_TAKEN_MESSAGE);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && JSON.stringify(err.meta ?? {}).includes("transactionId")) {
      throw new AppError("DUPLICATE_TRANSACTION", 409, "This transaction ID has already been used for a registration.");
    }
    throw err;
  }
}
