import { Prisma, type Event, type EventRegistration } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { createMemberAccount, hashMemberPassword } from "@/lib/members/create-member";
import { processAvatar, removeAvatarDir, saveAvatar } from "@/lib/media/avatars";
import { processProof, removeProofDir, saveProof } from "@/lib/media/proofs";
import { PROOF_NOTE_MAX, isProofType, type ProofType } from "@/lib/members/proof-types";
import { CLOSED_MESSAGES, registrationClosedReason } from "./availability";
import { computeFee } from "./pricing";
import { eventFeeRules } from "./service";
import { ticketInfo } from "./tickets";
import { PAYMENT_METHODS, type AccountInput, type MemberRegistration, type ProofInput, type RsvpInput } from "./types";

const ACTIVE_STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN"] as const;

function normalizeTransactionId(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, "").toUpperCase();
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
      const closed = registrationClosedReason({ ...event, ...rules }, reservedHeads, now);
      if (closed) throw new AppError("REGISTRATION_CLOSED", 409, CLOSED_MESSAGES[closed]);

      const existing = await tx.eventRegistration.findUnique({
        where: { eventId_userId: { eventId: event.id, userId } },
        select: { id: true },
      });
      if (existing) throw new AppError("ALREADY_REGISTERED", 409, "You are already registered for this event.");

      const price = computeFee(rules, args.rsvp);
      if (event.isMembershipEvent && price.fee <= 0) {
        throw new AppError("MEMBERSHIP_MUST_BE_PAID", 400, "Membership registration requires a paid package.");
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
        if (!/^[A-Z0-9-]{6,40}$/.test(transactionId)) {
          throw new AppError("PAYMENT_REQUIRED", 400, "Please enter the transaction ID from your payment (6–40 letters or numbers).");
        }
        if (await tx.eventRegistration.findUnique({ where: { transactionId }, select: { id: true } })) {
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

  return { registration: await toMemberRegistration(result.registration), createdAccount: result.createdAccount };
}

export async function getMemberRegistration(slug: string, userId: string): Promise<MemberRegistration | null> {
  const reg = await prisma.eventRegistration.findFirst({ where: { userId, event: { slug } }, include: { event: true } });
  return reg ? toMemberRegistration(reg) : null;
}

export async function listMemberRegistrations(userId: string): Promise<MemberRegistration[]> {
  const regs = await prisma.eventRegistration.findMany({
    where: { userId },
    include: { event: true },
    orderBy: { event: { date: "asc" } },
  });
  return Promise.all(regs.map(toMemberRegistration));
}
