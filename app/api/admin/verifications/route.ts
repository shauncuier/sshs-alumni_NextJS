import { NextResponse } from "next/server";
import { emailMembershipDecision, emailRegistration } from "@/lib/member-emails";
import { smsRegistrationConfirmed } from "@/lib/member-sms";
import { postRegistrationIncome } from "@/lib/finance/posting";
import { logActivity } from "@/lib/activity-log";
import { hasPendingMembershipPayment } from "@/lib/events/membership";
import prisma from "@/lib/prisma";
import { getSessionUser, isAdminRole } from "@/lib/session-user";
import { AppError } from "@/lib/app-error";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { isBanglaQr, normalizeMerchantTrxId } from "@/lib/payments/bangla-qr";
import { assertMerchantTrxIdFree, isMerchantTrxClash } from "@/lib/payments/merchant-trx";

const REQUEST_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;
type RequestStatus = (typeof REQUEST_STATUSES)[number];

// GET /api/admin/verifications?status=PENDING|VERIFIED|REJECTED|all (default PENDING)
export async function GET(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me || !isAdminRole(me.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const statusParam = new URL(req.url).searchParams.get("status") ?? "PENDING";
    if (statusParam !== "all" && !REQUEST_STATUSES.includes(statusParam as RequestStatus)) {
      return NextResponse.json(
        { error: "Invalid status. Use PENDING, VERIFIED, REJECTED or all." },
        { status: 400 }
      );
    }

    try {
      const requests = await prisma.verificationRequest.findMany({
        where: statusParam === "all" ? {} : { status: statusParam as RequestStatus },
        include: {
          // Select account fields explicitly so the password hash never leaves the server.
          user: { select: { email: true, status: true, profile: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const withPayment = await Promise.all(
        requests.map(async (r) => {
          const reg =
            (await prisma.eventRegistration.findFirst({
              where: { userId: r.userId, status: "PENDING_PAYMENT", event: { isMembershipEvent: true } },
              select: {
                id: true,
                eventId: true,
                status: true,
                transactionId: true,
                paymentMethod: true,
                totalFee: true,
                notes: true,
                payerAccountLast4: true,
                payerPaidAt: true,
                merchantTrxId: true,
                event: { select: { id: true, title: true, slug: true } },
              },
            })) ??
            (await prisma.eventRegistration.findFirst({
              where: { userId: r.userId, event: { isMembershipEvent: true } },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                eventId: true,
                status: true,
                transactionId: true,
                paymentMethod: true,
                totalFee: true,
                notes: true,
                payerAccountLast4: true,
                payerPaidAt: true,
                merchantTrxId: true,
                event: { select: { id: true, title: true, slug: true } },
              },
            }));
          const receiptMatch = reg?.notes ? /\[Payment Screenshot:\s*([^\]]+)\]/.exec(reg.notes) : null;
          const paymentReceiptUrl = receiptMatch ? receiptMatch[1].trim() : null;

          return {
            ...r,
            awaitingPayment: reg?.status === "PENDING_PAYMENT",
            paymentStatus: reg?.status ?? null,
            membershipEventId: reg?.event?.id ?? null,
            membershipEventSlug: reg?.event?.slug ?? null,
            registrationId: reg?.id ?? null,
            paymentMethod: reg?.paymentMethod ?? null,
            transactionId: reg?.transactionId ?? null,
            totalFee: reg?.totalFee ?? null,
            payerAccountLast4: reg?.payerAccountLast4 ?? null,
            payerPaidAt: reg?.payerPaidAt ?? null,
            merchantTrxId: reg?.merchantTrxId ?? null,
            paymentReceiptUrl,
          };
        })
      );
      return NextResponse.json({ requests: withPayment, total: withPayment.length });
    } catch (dbErr) {
      console.error("Admin verification fetch failed:", dbErr);
      return NextResponse.json(
        { error: "Could not load verification requests from the database." },
        { status: 503 }
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Admin verification fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await getSessionUser();
    if (!me || !isAdminRole(me.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const body = await readJsonBody(req);
    const { requestId, status } = body;

    if (!requestId || !["VERIFIED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid requestId or status. Status must be VERIFIED or REJECTED." },
        { status: 400 }
      );
    }

    const decision = status as "VERIFIED" | "REJECTED";

    try {
      // Record the decision on the request and apply it to the account and
      // profile together: the directory lists only VERIFIED profiles, and the
      // session, profile page and ID card read User.status.
      const result = await prisma.$transaction(async (tx) => {
        const request = await tx.verificationRequest.findUnique({ where: { id: requestId } });
        if (!request) return { error: "Verification request not found.", code: 404 } as const;
        // Only pending requests can be decided, so a late or duplicate request
        // can never downgrade an account that is already verified.
        if (request.status !== "PENDING") {
          return { error: `Verification request is already ${request.status.toLowerCase()}.`, code: 409 } as const;
        }

        // If this user has an unconfirmed Jubilee membership registration,
        // confirm the event registration and payment directly alongside verification.
        let confirmedRegistrationId: string | null = null;
        const pendingPayment = await hasPendingMembershipPayment(tx, request.userId);
        if (pendingPayment) {
          if (decision === "VERIFIED") {
            const pendingReg = await tx.eventRegistration.findFirst({
              where: { userId: request.userId, status: "PENDING_PAYMENT", event: { isMembershipEvent: true } },
            });
            if (pendingReg) {
              // Bangla QR: the TrxID in the association's own SMS, so one SMS confirms one payment.
              let merchantTrxId: string | undefined;
              if (isBanglaQr(pendingReg.paymentMethod)) {
                merchantTrxId = normalizeMerchantTrxId(body.merchantTrxId);
                await assertMerchantTrxIdFree(tx, merchantTrxId, { registrationId: pendingReg.id });
              }
              await tx.eventRegistration.update({
                where: { id: pendingReg.id },
                data: {
                  status: "CONFIRMED",
                  confirmedBy: me.email,
                  confirmedAt: new Date(),
                  merchantTrxId,
                },
              });
              confirmedRegistrationId = pendingReg.id;
              await postRegistrationIncome(tx, pendingReg.id, me.email);
            }
          } else {
            await tx.eventRegistration.updateMany({
              where: { userId: request.userId, status: "PENDING_PAYMENT", event: { isMembershipEvent: true } },
              data: { status: "CANCELLED" },
            });
          }
        }

        const updated = await tx.verificationRequest.update({
          where: { id: requestId },
          // updatedAt records when the review happened.
          data: { status: decision, reviewedBy: me.email },
        });
        await tx.user.update({ where: { id: request.userId }, data: { status: decision, sessionVersion: { increment: 1 } } });
        await tx.alumniProfile.updateMany({
          where: { userId: request.userId },
          data: { verificationStatus: decision },
        });
        return { updated, confirmedRegistrationId } as const;
      });

      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: result.code });
      }
      const updated =
        (await prisma.verificationRequest.findUnique({ where: { id: requestId } }).catch(() => null)) ?? result.updated;

      const member = await prisma.user
        .findUnique({ where: { id: result.updated.userId }, select: { email: true, profile: { select: { fullName: true, sscBatch: true } } } })
        .catch(() => null);
      const who = member ? `${member.profile?.fullName ?? member.email} (${member.email}${member.profile ? `, SSC ${member.profile.sscBatch}` : ""})` : `user ${result.updated.userId}`;
      await logActivity({
        category: "ADMIN",
        action: decision === "VERIFIED" ? "membership.approved" : "membership.rejected",
        summary: `${decision === "VERIFIED" ? "Approved" : "Rejected"} the membership of ${who}`,
        actor: me,
        targetType: "User",
        targetId: result.updated.userId,
        metadata: { verificationRequestId: requestId },
        req,
      });
      // Tell the member (never fails the decision).
      await emailMembershipDecision(result.updated.userId, decision);
      if (result.confirmedRegistrationId) {
        await emailRegistration(result.confirmedRegistrationId, "confirmed");
        await smsRegistrationConfirmed(result.confirmedRegistrationId);
      }
      return NextResponse.json({
        message: `Verification request ${status.toLowerCase()} successfully`,
        request: updated,
      });
    } catch (dbErr) {
      if (dbErr instanceof AppError) throw dbErr;
      if (isMerchantTrxClash(dbErr)) {
        return NextResponse.json({ error: "This SMS TrxID is already recorded for another payment.", code: "DUPLICATE_MERCHANT_TRX" }, { status: 409 });
      }
      console.error("Verification decision failed:", dbErr);
      return NextResponse.json(
        { error: "Could not save the verification decision. Please try again." },
        { status: 503 }
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Admin verification PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
