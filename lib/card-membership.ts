// Server-side check that a signed alumni pass still belongs to a verified member.

import prisma from "@/lib/prisma";
import type { CardPayload } from "@/lib/id-card";

export type MembershipCheck =
  | { ok: true }
  | { ok: false; securityStatus: string; error: string; httpStatus: number };

/**
 * A valid signature only proves the pass was issued once. Accept it only if the
 * member account still exists and is VERIFIED now, so rejected, pending or
 * deleted accounts are refused even with a pass issued before the change.
 * Fails closed when the database cannot be reached.
 */
export async function checkCardMembership(payload: CardPayload): Promise<MembershipCheck> {
  if (!payload.userId) {
    return {
      ok: false,
      securityStatus: "NO_MEMBER_ACCOUNT",
      error: "This pass is not linked to a member account.",
      httpStatus: 403,
    };
  }

  let user: { status: string } | null;
  try {
    user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { status: true } });
  } catch (dbErr) {
    console.error("[Card Membership] Member status lookup failed:", dbErr);
    // Do not call a genuine pass forged: the check could not run.
    return {
      ok: false,
      securityStatus: "STATUS_CHECK_UNAVAILABLE",
      error: "Could not check membership status right now. Please try again or use the Help Desk.",
      httpStatus: 503,
    };
  }

  if (!user) {
    return {
      ok: false,
      securityStatus: "ACCOUNT_NOT_FOUND",
      error: `No member account exists for ${payload.fullName} any more.`,
      httpStatus: 403,
    };
  }
  if (user.status === "PENDING") {
    return {
      ok: false,
      securityStatus: "UNDER_REVIEW",
      error: `Membership for ${payload.fullName} is still pending verification.`,
      httpStatus: 403,
    };
  }
  if (user.status !== "VERIFIED") {
    return {
      ok: false,
      securityStatus: "MEMBERSHIP_REJECTED",
      error: `Membership for ${payload.fullName} has been rejected.`,
      httpStatus: 403,
    };
  }
  return { ok: true };
}
