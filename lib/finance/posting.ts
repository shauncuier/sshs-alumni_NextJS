import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { toPoisha } from "./money";
import { dhakaDay } from "./dates";
import { nextVoucherNo } from "./entries";
import { accountIdForMethod, ensureFinanceDefaults, systemCategoryId, type SystemCategoryKey } from "./setup";

/**
 * Income the site records by itself: a registration's fee (and any donation added to it)
 * once its payment is confirmed, and a donation once it is verified. Called inside the
 * same transaction that confirms the payment, so the books and the registration never
 * disagree. Each line is posted at most once (unique source + id + line), so calling
 * again, or syncFromSite, never counts money twice.
 */

type Tx = Prisma.TransactionClient;

const PAID = ["CONFIRMED", "CHECKED_IN"];

async function postLine(
  tx: Tx,
  line: {
    source: "REGISTRATION" | "DONATION";
    sourceId: string;
    sourceLine: string;
    amount: number;
    category: SystemCategoryKey;
    method: string | null;
    date: Date;
    eventId: string | null;
    party: string;
    description: string;
    reference: string | null;
    actor: string;
  }
): Promise<boolean> {
  if (line.amount <= 0) return false;
  const exists = await tx.financeEntry.findUnique({
    where: { source_sourceId_sourceLine: { source: line.source, sourceId: line.sourceId, sourceLine: line.sourceLine } },
    select: { id: true },
  });
  if (exists) return false;
  const date = dhakaDay(line.date);
  await tx.financeEntry.create({
    data: {
      voucherNo: await nextVoucherNo(tx, "INCOME", date.getUTCFullYear()),
      kind: "INCOME",
      date,
      amount: line.amount,
      accountId: await accountIdForMethod(tx, line.method),
      categoryId: await systemCategoryId(tx, line.category),
      eventId: line.eventId,
      party: line.party.slice(0, 160),
      description: line.description.slice(0, 500),
      reference: line.reference?.slice(0, 80) ?? null,
      status: "APPROVED",
      source: line.source,
      sourceId: line.sourceId,
      sourceLine: line.sourceLine,
      createdBy: line.actor,
      approvedBy: line.actor,
      approvedAt: new Date(),
    },
  });
  return true;
}

/** Posts a confirmed registration's fee and donation; returns how many lines were added. */
export async function postRegistrationIncome(tx: Tx, registrationId: string, actorEmail: string): Promise<number> {
  const reg = await tx.eventRegistration.findUnique({
    where: { id: registrationId },
    include: { event: { select: { id: true, title: true, isMembershipEvent: true } }, user: { select: { email: true, profile: { select: { fullName: true, sscBatch: true } } } } },
  });
  if (!reg || !PAID.includes(reg.status)) return 0;
  await ensureFinanceDefaults(tx);
  const who = reg.user.profile ? `${reg.user.profile.fullName} (SSC ${reg.user.profile.sscBatch})` : reg.user.email;
  const base = { source: "REGISTRATION" as const, sourceId: reg.id, method: reg.paymentMethod, date: reg.confirmedAt ?? reg.createdAt, eventId: reg.event.id, party: who, reference: reg.transactionId, actor: actorEmail };
  let posted = 0;
  if (
    await postLine(tx, {
      ...base,
      sourceLine: "fee",
      amount: toPoisha(reg.totalFee),
      category: reg.event.isMembershipEvent ? "membership_fees" : "registration_fees",
      description: `${reg.event.title}: ${reg.packageName ? `${reg.packageName}, ` : ""}${reg.headCount} ${reg.headCount === 1 ? "person" : "people"}`,
    })
  )
    posted++;
  if (await postLine(tx, { ...base, sourceLine: "donation", amount: toPoisha(reg.donationAmount), category: "donations", description: `Donation with the ${reg.event.title} registration` })) posted++;
  return posted;
}

/** Voids the income a registration posted, when the registration is cancelled. */
export async function voidRegistrationIncome(tx: Tx, registrationId: string, reason: string, actorEmail: string): Promise<number> {
  const voided = await tx.financeEntry.updateMany({
    where: { source: "REGISTRATION", sourceId: registrationId, status: { not: "VOID" } },
    data: { status: "VOID", voidedBy: actorEmail, voidedAt: new Date(), voidReason: reason.slice(0, 300) },
  });
  return voided.count;
}

/** Posts a verified (completed) donation. */
export async function postDonationIncome(tx: Tx, donationId: string, actorEmail: string): Promise<number> {
  const d = await tx.donation.findUnique({ where: { id: donationId }, include: { campaign: { select: { title: true } } } });
  if (!d || d.paymentStatus !== "COMPLETED") return 0;
  await ensureFinanceDefaults(tx);
  const posted = await postLine(tx, {
    source: "DONATION",
    sourceId: d.id,
    sourceLine: "donation",
    amount: toPoisha(d.amount),
    category: "donations",
    method: d.paymentMethod,
    date: d.paidAt ?? d.createdAt,
    eventId: null,
    party: d.isAnonymous ? "Anonymous donor" : `${d.donorName}${d.donorBatch ? ` (SSC ${d.donorBatch})` : ""}`,
    description: `Donation to ${d.campaign.title}${d.receiptId ? ` · receipt ${d.receiptId}` : ""}`,
    reference: d.transactionRef,
    actor: actorEmail,
  });
  return posted ? 1 : 0;
}

/**
 * Posts every paid registration and completed donation that is not in the books yet:
 * run once after the accounts are set up, and any time to catch up. Never doubles.
 */
export async function syncFromSite(actorEmail: string): Promise<{ registrations: number; donations: number }> {
  await ensureFinanceDefaults();
  const postedRegs = await prisma.financeEntry.findMany({ where: { source: "REGISTRATION" }, select: { sourceId: true }, distinct: ["sourceId"] });
  const postedDonations = await prisma.financeEntry.findMany({ where: { source: "DONATION" }, select: { sourceId: true } });
  const regs = await prisma.eventRegistration.findMany({
    where: { status: { in: ["CONFIRMED", "CHECKED_IN"] }, id: { notIn: postedRegs.map((r) => r.sourceId!).filter(Boolean) }, OR: [{ totalFee: { gt: 0 } }, { donationAmount: { gt: 0 } }] },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  const donations = await prisma.donation.findMany({
    where: { paymentStatus: "COMPLETED", id: { notIn: postedDonations.map((r) => r.sourceId!).filter(Boolean) } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  let registrations = 0;
  for (const r of regs) registrations += await prisma.$transaction((tx) => postRegistrationIncome(tx, r.id, actorEmail));
  let donated = 0;
  for (const d of donations) donated += await prisma.$transaction((tx) => postDonationIncome(tx, d.id, actorEmail));
  return { registrations, donations: donated };
}
