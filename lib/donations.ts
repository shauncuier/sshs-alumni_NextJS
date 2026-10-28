import crypto from "crypto";
import { donationReceiptEmail } from "@/lib/email-templates";
import { availableMethods, getPaymentSettings } from "@/lib/payment-settings";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { sendEmail } from "@/lib/email";
import { smsDonationReceived } from "@/lib/member-sms";
import { paymentNoticesOn } from "@/lib/payment-notices";
import { openCampaignOrThrow } from "@/lib/campaigns";
import { postDonationIncome } from "@/lib/finance/posting";
import { processReceipt, removeReceiptDir, saveReceipt } from "@/lib/media/receipts";
import { isBanglaQr, normalizeLast4, normalizeMerchantTrxId, normalizePaidAt } from "@/lib/payments/bangla-qr";
import { assertMerchantTrxIdFree, isMerchantTrxClash } from "@/lib/payments/merchant-trx";

/**
 * Donations without a payment gateway: the donor pays by bKash, Nagad, Bangla QR,
 * bank transfer or cash, then submits the transaction ID. The donation stays
 * PENDING until a committee member checks the payment and verifies it; only then
 * does it count towards the campaign total and the donor get a receipt. Every method
 * except cash needs a screenshot of the payment; Bangla QR also needs the last 4 digits
 * of the paying account and the time (see lib/payments/bangla-qr.ts).
 */

export const DONATION_METHODS = ["bKash", "Nagad", "Bangla QR", "Bank", "Cash"] as const;
export type DonationMethod = (typeof DONATION_METHODS)[number];
export const MIN_DONATION = 10;
export const MAX_DONATION = 10_000_000;

export interface ManualDonationInput {
  campaignId?: unknown;
  amount?: unknown;
  donorName?: unknown;
  donorEmail?: unknown;
  donorPhone?: unknown;
  donorBatch?: unknown;
  paymentMethod?: unknown;
  transactionId?: unknown;
  payerAccountLast4?: unknown;
  payerPaidAt?: unknown;
  isAnonymous?: unknown;
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** Same rule as event registrations: the reference the donor's payment app or bank showed. */
export function normalizeTransactionRef(value: unknown): string {
  return (typeof value === "string" ? value : "").replace(/\s+/g, "").toUpperCase();
}

function newReceiptId(): string {
  return `SSGHS-DON-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createManualDonation(input: ManualDonationInput, userId: string | null, screenshot?: Buffer) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < MIN_DONATION || amount > MAX_DONATION) {
    throw new AppError("INVALID_DONATION", 400, `Please enter an amount between ৳${MIN_DONATION} and ৳${MAX_DONATION.toLocaleString("en-US")}.`);
  }
  const donorName = text(input.donorName, 120);
  const donorEmail = text(input.donorEmail, 254).toLowerCase();
  const donorPhone = text(input.donorPhone, 30);
  if (!donorName) throw new AppError("INVALID_DONATION", 400, "Please enter your name.");
  if (donorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail)) throw new AppError("INVALID_DONATION", 400, "Please enter a valid email address.");
  if (!donorEmail && !donorPhone) throw new AppError("INVALID_DONATION", 400, "Please give an email address or a phone number, so the committee can reach you.");
  if (!(DONATION_METHODS as readonly string[]).includes(input.paymentMethod as string)) {
    throw new AppError("INVALID_DONATION", 400, "Please choose how you paid.");
  }
  const method = input.paymentMethod as DonationMethod;
  const accepted = availableMethods(await getPaymentSettings());
  if (accepted.length > 0 && !(accepted as string[]).includes(method)) {
    throw new AppError("INVALID_DONATION", 400, `${method} is not accepted right now. Please choose another way to pay.`);
  }
  const transactionRef = normalizeTransactionRef(input.transactionId);
  if (!/^[A-Z0-9-]{6,40}$/.test(transactionRef)) {
    throw new AppError("INVALID_DONATION", 400, "Please enter the transaction ID from your payment (6–40 letters or numbers).");
  }
  const payer = isBanglaQr(method) ? { payerAccountLast4: normalizeLast4(input.payerAccountLast4), payerPaidAt: normalizePaidAt(input.payerPaidAt) } : null;
  if (method !== "Cash" && !screenshot) throw new AppError("SCREENSHOT_REQUIRED", 400, "Attach the screenshot of your payment receipt.");
  const batch = Number(input.donorBatch);
  const donorBatch = Number.isInteger(batch) && batch >= 1960 && batch <= new Date().getFullYear() ? batch : null;

  // Closed, ended and not-yet-started campaigns take no donations.
  const campaign = await openCampaignOrThrow(input.campaignId);

  // One payment, one claim: a transaction ID already used for a donation or a
  // registration cannot be submitted again.
  const [usedByDonation, usedByRegistration] = await Promise.all([
    prisma.donation.findFirst({ where: { transactionRef, paymentStatus: { not: "FAILED" } }, select: { id: true } }),
    prisma.eventRegistration.findUnique({ where: { transactionId: transactionRef }, select: { id: true } }),
  ]);
  if (usedByDonation || usedByRegistration) {
    throw new AppError("DUPLICATE_TRANSACTION", 409, "This transaction ID has already been submitted.");
  }

  // The screenshot is processed (and refused if it isn't an image or PDF) before it is saved.
  const saved = screenshot ? await saveReceipt(await processReceipt(screenshot)) : null;
  return prisma.donation.create({
    data: {
      payerAccountLast4: payer?.payerAccountLast4 ?? null,
      payerPaidAt: payer?.payerPaidAt ?? null,
      paymentScreenshotUrl: saved?.fileUrl ?? null,
      campaignId: campaign.id,
      userId,
      donorName,
      donorEmail: donorEmail || null,
      donorPhone: donorPhone || null,
      donorBatch,
      amount,
      paymentMethod: method,
      paymentGateway: "MANUAL",
      paymentStatus: "PENDING",
      isAnonymous: input.isAnonymous === true,
      transactionRef,
      receiptId: newReceiptId(),
    },
    include: { campaign: { select: { title: true } } },
  }).catch(async (err: unknown) => {
    if (saved) await removeReceiptDir(saved.dir);
    throw err;
  });
}

export type DonationDecision = "VERIFY" | "REJECT";

/**
 * Verifies or rejects a pending manual donation. Verifying adds it to the campaign
 * total exactly once (the status check and the update happen together), then emails
 * and texts the donor a receipt (unless turned off in Admin → Payments).
 */
export async function decideDonation(args: {
  donationId: string;
  decision: DonationDecision;
  reason?: unknown;
  adminEmail: string;
  /** The TrxID from the association's SMS; required to verify a Bangla QR donation. */
  merchantTrxId?: unknown;
}) {
  if (args.decision !== "VERIFY" && args.decision !== "REJECT") throw new AppError("INVALID_REQUEST", 400, "Unknown action.");
  const reason = text(args.reason, 500);
  if (args.decision === "REJECT" && !reason) throw new AppError("REASON_REQUIRED", 400, "Please say why the donation is rejected (the donor may ask).");

  const donation = await prisma.$transaction(async (tx) => {
    const current = await tx.donation.findUnique({ where: { id: args.donationId } });
    if (!current) throw new AppError("DONATION_NOT_FOUND", 404, "Donation not found.");
    if (current.paymentGateway !== "MANUAL") throw new AppError("NOT_MANUAL", 409, "Only manual donations are verified here.");
    let merchantTrxId: string | undefined;
    if (args.decision === "VERIFY" && isBanglaQr(current.paymentMethod)) {
      merchantTrxId = normalizeMerchantTrxId(args.merchantTrxId);
      await assertMerchantTrxIdFree(tx, merchantTrxId, { donationId: current.id });
    }
    const changed = await tx.donation.updateMany({
      where: { id: current.id, paymentStatus: "PENDING" },
      data:
        args.decision === "VERIFY"
          ? { paymentStatus: "COMPLETED", paidAt: new Date(), failureReason: null, merchantTrxId }
          : { paymentStatus: "FAILED", failureReason: `Rejected by ${args.adminEmail}: ${reason}` },
    });
    if (changed.count === 0) {
      throw new AppError("ALREADY_DECIDED", 409, `This donation is already ${current.paymentStatus === "COMPLETED" ? "verified" : "decided"}.`);
    }
    if (args.decision === "VERIFY") {
      await tx.donationCampaign.update({
        where: { id: current.campaignId },
        data: { raisedAmount: { increment: current.amount }, donorCount: { increment: 1 } },
      });
      await postDonationIncome(tx, current.id, args.adminEmail);
    }
    return tx.donation.findUniqueOrThrow({ where: { id: current.id }, include: { campaign: { select: { title: true } } } });
  }).catch((err: unknown) => {
    if (isMerchantTrxClash(err)) throw new AppError("DUPLICATE_MERCHANT_TRX", 409, "This SMS TrxID is already recorded for another payment.");
    throw err;
  });

  if (args.decision === "VERIFY" && donation.donorEmail && (await paymentNoticesOn()).email) {
    const receipt = donationReceiptEmail({
      donorName: donation.donorName,
      amount: donation.amount,
      campaignTitle: donation.campaign.title,
      receiptId: donation.receiptId ?? donation.id,
      paymentMethod: donation.paymentMethod,
      transactionRef: donation.transactionRef ?? "",
    });
    const sent = await sendEmail({ to: donation.donorEmail, ...receipt });
    if (!sent.success) console.warn("[donations] Receipt email failed:", sent.error);
  }
  if (args.decision === "VERIFY") await smsDonationReceived(donation.id);
  return donation;
}
