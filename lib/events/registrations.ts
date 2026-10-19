import { Prisma, type Event, type EventRegistration } from "@prisma/client";
import { emailRegistration } from "@/lib/member-emails";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { createMemberAccount, hashMemberPassword } from "@/lib/members/create-member";
import { processAvatar, removeAvatarDir, saveAvatar } from "@/lib/media/avatars";
import { processProof, removeProofDir, saveProof } from "@/lib/media/proofs";
import { PROOF_NOTE_MAX, isProofType, type ProofType } from "@/lib/members/proof-types";
import { readVerifiedPhone } from "@/lib/phone-otp";
import { readVerifiedEmail } from "@/lib/email-otp";
import { CLOSED_MESSAGES, registrationClosedReason } from "./availability";
import { computeFee, storedGuests } from "./pricing";
import { availableMethods, getPaymentSettings } from "@/lib/payment-settings";
import { eventFeeRules } from "./service";
import { ticketInfo } from "./tickets";
import { PAYMENT_METHODS, type AccountInput, type MemberRegistration, type ProofInput, type RsvpInput } from "./types";
import { canonicalPhone, isPhoneClash, PHONE_TAKEN_MESSAGE, requirePhoneFree } from "@/lib/phone-registry";
import { smsRegistrationConfirmed } from "@/lib/member-sms";

const ACTIVE_STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN"] as const;

function normalizeTransactionId(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, "").toUpperCase();
}

/**
 * A new member must prove a contact: the phone by SMS code, or, only while the SMS
 * service is down, the email by emailed code (lib/email-otp.ts refuses otherwise). A
 * verified phone replaces the typed one; an email token only counts for the exact
 * address on the form, and the typed number must still be a valid mobile number.
 */
function checkContactVerified(account: AccountInput): AccountInput {
  if (account.phoneVerificationToken) {
    return { ...account, phone: readVerifiedPhone(account.phoneVerificationToken) };
  }
  if (account.emailVerificationToken) {
    const verified = readVerifiedEmail(account.emailVerificationToken);
    if (!verified || verified !== account.email?.trim().toLowerCase()) {
      throw new AppError("EMAIL_NOT_VERIFIED", 400, "Please verify your email address with the emailed code.");
    }
    return { ...account, phone: canonicalPhone(account.phone) };
  }
  throw new AppError("CONTACT_NOT_VERIFIED", 400, "Please verify your phone number with the SMS code (or your email if the SMS does not arrive).");
}

const proofRequired = () => new AppError("PROOF_REQUIRED", 400, "Please add a document that shows you studied at SSGHS.");

/** Checks the proof-of-study details a new member sent (the file itself is checked by processProof). */
function checkProofDetails(proof: ProofInput | undefined): { type: ProofType; note: string | null; file: Buffer } {
  if (!proof?.file || proof.file.length === 0) throw proofRequired();
  if (!isProofType(proof.type)) throw new AppError("INVALID_PROOF", 400, "Please choose the type of document.");
  const note = typeof proof.note === "string" ? proof.note.trim() : "";
  if (proof.type === "OTHER" && !note) throw new AppError("INVALID_PROOF", 400, "Please describe the document.");
  if (note.length > PROOF_NOTE_MAX) {
    throw new AppError("INVALID_PROOF", 400, `Please keep the description to ${PROOF_NOTE_MAX} characters or fewer.`);
  }
  return { type: proof.type, note: note || null, file: proof.file };
}

export const ALREADY_MEMBER_MESSAGE =
  "You are already a member, so your Golden Jubilee registration is paid. Please do not pay again. If you cannot find your ticket on your dashboard, write to the committee.";

/** A registration's source tag: lower-case letters, digits and . _ / - only, at most 80 characters. */
export function cleanSource(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const tag = raw.trim().toLowerCase().replace(/[^a-z0-9._/-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return tag || null;
}

async function toMemberRegistration(reg: EventRegistration & { event: Event }): Promise<MemberRegistration> {
  const hasTicket = reg.status === "CONFIRMED" || reg.status === "CHECKED_IN";
  return {
    id: reg.id,
    eventId: reg.eventId,
    eventSlug: reg.event.slug,
    eventTitle: reg.event.title,
    eventDate: reg.event.date.toISOString().slice(0, 10),
    status: reg.status,
    isMembershipEvent: reg.event.isMembershipEvent,
    packageName: reg.packageName,
    guests: storedGuests(reg),
    headCount: reg.headCount,
    totalFee: reg.totalFee,
    donationAmount: reg.donationAmount,
    paymentMethod: reg.paymentMethod,
    transactionId: reg.transactionId,
    createdAt: reg.createdAt.toISOString(),
    ticket: hasTicket ? await ticketInfo(reg.id) : null,
  };
}

/**
 * One endpoint for joining (membership event, may create the account) and for
 * registering verified members for other events. Everything happens in one
 * transaction, so a failure never leaves half an account or registration behind.
 */
export async function registerForEvent(args: {
  slug: string;
  sessionUserId: string | null;
  account?: AccountInput;
  rsvp: RsvpInput;
  /** Profile photo (raw upload); required when a signed-out visitor joins. */
  photo?: Buffer;
  /** Proof of study (type, note and raw upload); required when a signed-out visitor joins. */
  proof?: ProofInput;
  now?: Date;
}): Promise<{ registration: MemberRegistration; createdAccount: { email: string } | null }> {
  const now = args.now ?? new Date();

  // A new member needs a photo and a proof-of-study document. Both are saved BEFORE
  // the transaction (file writes cannot roll back) and deleted again if anything
  // below fails, so no orphan files remain. Their URLs are only ever set by the
  // server, never taken from the request.
  let account: AccountInput | undefined = args.account && {
    ...args.account,
    avatarUrl: null,
    avatarOriginalUrl: null,
    proofType: null,
    proofNote: null,
    proofFileUrl: null,
    proofMime: null,
  };
  let photoDir: string | null = null;
  let proofDir: string | null = null;
  const removeUploads = async () => {
    if (photoDir) await removeAvatarDir(photoDir);
    if (proofDir) await removeProofDir(proofDir);
  };
  // Hashed here, not inside the transaction: bcrypt is slow and the transaction
  // holds the event row lock, which would make every join wait for it.
  let passwordHash: string | null = null;
  if (!args.sessionUserId && account) {
    const event = await prisma.event.findUnique({ where: { slug: args.slug }, select: { isMembershipEvent: true } });
    if (event?.isMembershipEvent) {
      account = checkContactVerified(account);
      if (!args.photo) throw new AppError("PHOTO_REQUIRED", 400, "Please add a profile photo.");
      const proof = checkProofDetails(args.proof);
      passwordHash = await hashMemberPassword(account.password);
      // Validate both files before writing either of them.
      const photoFiles = await processAvatar(args.photo);
      const proofFile = await processProof(proof.file);
      try {
        const savedPhoto = await saveAvatar(photoFiles);
        photoDir = savedPhoto.dir;
        const savedProof = await saveProof(proofFile);
        proofDir = savedProof.dir;
        account = {
          ...account,
          avatarUrl: savedPhoto.avatarUrl,
          avatarOriginalUrl: savedPhoto.originalUrl,
          proofType: proof.type,
          proofNote: proof.note,
          proofFileUrl: savedProof.fileUrl,
          proofMime: savedProof.mime,
        };
      } catch (err) {
        await removeUploads();
        throw err;
      }
    }
  }

  const result = await prisma
    .$transaction(async (tx) => {
      // Lock the event row first, so registrations for one event run one at a time
      // and capacity checks cannot race. READ COMMITTED (below) makes the reads
      // after the lock see registrations committed while this one was waiting.
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM \`Event\` WHERE slug = ${args.slug} FOR UPDATE`;
      if (locked.length === 0) throw new AppError("EVENT_NOT_FOUND", 404, "Event not found.");
      const event = await tx.event.findUniqueOrThrow({ where: { id: locked[0].id } });

      let userId = args.sessionUserId;
      let createdAccount: { email: string } | null = null;
      if (!userId) {
        if (!event.isMembershipEvent) {
          throw new AppError("SIGN_IN_REQUIRED", 401, "Sign in to register for this event.");
        }
        if (!account) throw new AppError("INVALID_ACCOUNT", 400, "Please fill in your details.");
        // The membership flag was read before the transaction; re-check under the lock.
        if (!account.avatarUrl) throw new AppError("PHOTO_REQUIRED", 400, "Please add a profile photo.");
        if (!account.proofFileUrl) throw proofRequired();
        // One number, one account (checked again here: the SMS may be minutes old).
        if (account.phone) await requirePhoneFree(account.phone, { db: tx });
        const created = await createMemberAccount(tx, account, passwordHash);
        userId = created.id;
        createdAccount = { email: created.email };
      } else if (!event.isMembershipEvent) {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { status: true } });
        if (user?.status !== "VERIFIED") {
          throw new AppError("VERIFIED_MEMBERS_ONLY", 403, "Only verified members can register for this event.");
        }
      }

      const reserved = await tx.eventRegistration.aggregate({
        where: { eventId: event.id, status: { in: [...ACTIVE_STATUSES] } },
        _sum: { headCount: true },
      });
      const reservedHeads = reserved._sum.headCount ?? 0;
      const rules = eventFeeRules(event);
      const methods = availableMethods(await getPaymentSettings());
      const closed = registrationClosedReason({ ...event, ...rules, globalPaymentReady: methods.length > 0 }, reservedHeads, now);
      if (closed) throw new AppError("REGISTRATION_CLOSED", 409, CLOSED_MESSAGES[closed]);

      const existing = await tx.eventRegistration.findUnique({
        where: { eventId_userId: { eventId: event.id, userId } },
        select: { id: true },
      });
      if (existing) throw new AppError("ALREADY_REGISTERED", 409, "You are already registered for this event.");
      // Paying the membership event is how someone joins, so an approved member has
      // paid it already: never take a second payment (even if their old registration
      // is missing, e.g. after a data clean-up; the committee sorts that out).
      // Staff accounts are made by admins, not by paying, so only an approved alumni
      // profile counts as having paid.
      if (event.isMembershipEvent && args.sessionUserId) {
        const member = await tx.user.findUnique({
          where: { id: userId },
          select: { status: true, profile: { select: { verificationStatus: true } } },
        });
        if (member?.status === "VERIFIED" && member.profile?.verificationStatus === "VERIFIED") {
          throw new AppError("ALREADY_MEMBER", 409, ALREADY_MEMBER_MESSAGE);
        }
      }

      // The member's fee depends on their SSC batch: the one on the join form, or their profile's.
      const sscBatch = account?.sscBatch ?? (await tx.alumniProfile.findUnique({ where: { userId }, select: { sscBatch: true } }))?.sscBatch;
      const price = computeFee(rules, args.rsvp, { sscBatch });
      if (event.isMembershipEvent && price.fee <= 0) {
        throw new AppError("MEMBERSHIP_MUST_BE_PAID", 400, "Membership registration requires a fee.");
      }
      if (reservedHeads + price.headCount > event.maxAttendees) {
        throw new AppError("REGISTRATION_CLOSED", 409, CLOSED_MESSAGES.FULL);
      }

      const needsPayment = price.total > 0;
      const transactionId = normalizeTransactionId(args.rsvp.transactionId);
      const paymentMethod = args.rsvp.paymentMethod ?? null;
      if (needsPayment) {
        if (!PAYMENT_METHODS.includes(paymentMethod as (typeof PAYMENT_METHODS)[number])) {
          throw new AppError("PAYMENT_REQUIRED", 400, "Please choose how you paid.");
        }
        // Only the methods the association accepts (when it has set any).
        if (methods.length > 0 && !(methods as string[]).includes(paymentMethod!)) {
          throw new AppError("PAYMENT_REQUIRED", 400, `${paymentMethod} is not accepted right now. Please choose another way to pay.`);
        }
        if (!/^[A-Z0-9-]{6,40}$/.test(transactionId)) {
          throw new AppError("PAYMENT_REQUIRED", 400, "Please enter the transaction ID from your payment (6–40 letters or numbers).");
        }
        const usedByDonation = await tx.donation.findFirst({ where: { transactionRef: transactionId, paymentStatus: { not: "FAILED" } }, select: { id: true } });
        if (usedByDonation || (await tx.eventRegistration.findUnique({ where: { transactionId }, select: { id: true } }))) {
          throw new AppError("DUPLICATE_TRANSACTION", 409, "This transaction ID has already been used for a registration.");
        }
      }

      const registration = await tx.eventRegistration.create({
        data: {
          eventId: event.id,
          userId,
          packageName: price.pkg?.name ?? null,
          extraAdults: price.extraAdults,
          extraChildren: price.extraChildren,
          guests: price.guests as unknown as Prisma.InputJsonValue,
          source: cleanSource(args.rsvp.source),
          headCount: price.headCount,
          guestCount: price.headCount,
          totalFee: price.fee,
          donationAmount: price.donation,
          tshirtSize: args.rsvp.tshirtSize?.trim() || null,
          mealPreference: args.rsvp.mealPreference?.trim() || null,
          notes: args.rsvp.notes?.trim() || null,
          paymentMethod: needsPayment ? paymentMethod : null,
          transactionId: needsPayment ? transactionId : null,
          status: needsPayment ? "PENDING_PAYMENT" : "CONFIRMED",
          confirmedAt: needsPayment ? null : now,
        },
        include: { event: true },
      });
      return { registration, createdAccount };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 })
    .catch((err: unknown) => {
      // A concurrent insert can still hit the unique constraints; report it clearly.
      if (isPhoneClash(err)) throw new AppError("PHONE_TAKEN", 409, PHONE_TAKEN_MESSAGE);
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Prisma 7's driver adapters (e.g. @prisma/adapter-mariadb) don't fill
        // meta.target; the offending unique index instead lives on
        // meta.driverAdapterError.cause.constraint.index (verified against the
        // adapter's actual output). Check that first, and fall back to target
        // and the raw meta text so this still works if that shape changes.
        const meta = err.meta as { target?: unknown; driverAdapterError?: { cause?: { constraint?: { index?: unknown } } } } | undefined;
        const indexName = String(meta?.driverAdapterError?.cause?.constraint?.index ?? "");
        const target = String(meta?.target ?? "");
        const isTransactionId =
          indexName.includes("transactionId") || target.includes("transactionId") || JSON.stringify(meta ?? {}).includes("transactionId");
        throw isTransactionId
          ? new AppError("DUPLICATE_TRANSACTION", 409, "This transaction ID has already been used for a registration.")
          : new AppError("ALREADY_REGISTERED", 409, "You are already registered for this event.");
      }
      throw err;
    })
    .catch(async (err: unknown) => {
      await removeUploads();
      throw err;
    });

  const registration = await toMemberRegistration(result.registration);
  // Never fails the registration: a mail problem is only logged.
  await emailRegistration(registration.id, registration.status === "PENDING_PAYMENT" ? "received" : "confirmed");
  // Confirmed at once (a free event): tell them by SMS too. Paid ones get it when the committee confirms.
  if (registration.status !== "PENDING_PAYMENT") await smsRegistrationConfirmed(registration.id);
  return { registration, createdAccount: result.createdAccount };
}

export async function getMemberRegistration(slug: string, userId: string): Promise<MemberRegistration | null> {
  const reg = await prisma.eventRegistration.findFirst({ where: { userId, event: { slug } }, include: { event: true } });
  return reg ? toMemberRegistration(reg) : null;
}

/**
 * Where a signed-in account stands with the membership (Golden Jubilee) event, for
 * pages that must not ask someone to pay twice:
 * - TICKET: registered and confirmed (or already checked in)
 * - REVIEW: paid, the committee is checking the payment
 * - MEMBER: an approved alumnus without a registration here; joining was paying
 *   for this event, so they have paid (same rule as ALREADY_MEMBER above)
 * - CANCELLED: their registration was cancelled
 * - null: nothing yet (may register and pay)
 */
export type MembershipStanding = "TICKET" | "REVIEW" | "MEMBER" | "CANCELLED" | null;

export async function membershipEventStanding(eventId: string, userId: string): Promise<MembershipStanding> {
  const [reg, user] = await Promise.all([
    prisma.eventRegistration.findUnique({ where: { eventId_userId: { eventId, userId } }, select: { status: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { status: true, profile: { select: { verificationStatus: true } } } }),
  ]);
  if (reg?.status === "CONFIRMED" || reg?.status === "CHECKED_IN") return "TICKET";
  if (reg?.status === "PENDING_PAYMENT") return "REVIEW";
  if (user?.status === "VERIFIED" && user.profile?.verificationStatus === "VERIFIED") return "MEMBER";
  if (reg?.status === "CANCELLED") return "CANCELLED";
  return null;
}

export async function listMemberRegistrations(userId: string): Promise<MemberRegistration[]> {
  const regs = await prisma.eventRegistration.findMany({
    where: { userId },
    include: { event: true },
    orderBy: { event: { date: "asc" } },
  });
  return Promise.all(regs.map(toMemberRegistration));
}
