import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { deleteProofFiles } from "@/lib/media/proofs";

/**
 * Proof-of-study documents are kept only until the membership is decided. Call
 * these AFTER the decision's transaction has committed: file deletion cannot roll
 * back, and a failure here must never undo or fail the decision. When a folder
 * cannot be deleted, the error is logged (request id only, no personal data) and
 * proofFileUrl stays set, so a later run of discardDecidedProofs() retries it.
 * The type, note, reviewer and decision time stay on the request.
 */
async function discardProofs(where: Prisma.VerificationRequestWhereInput, limit?: number): Promise<void> {
  let requests: { id: string; proofFileUrl: string | null }[];
  try {
    requests = await prisma.verificationRequest.findMany({
      // Only decided requests: a proof still waiting for review is never touched.
      where: { ...where, status: { not: "PENDING" }, proofFileUrl: { not: null } },
      select: { id: true, proofFileUrl: true },
      take: limit,
    });
  } catch (err) {
    console.error("[proof-retention] Could not look up decided proofs:", (err as Error)?.name ?? "error");
    return;
  }

  for (const request of requests) {
    try {
      await deleteProofFiles(request.proofFileUrl!);
      await prisma.verificationRequest.updateMany({
        where: { id: request.id, proofFileUrl: request.proofFileUrl },
        data: { proofFileUrl: null, proofDeletedAt: new Date() },
      });
    } catch (err) {
      const reason = (err as NodeJS.ErrnoException)?.code ?? (err as Error)?.name ?? "error";
      console.error(`[proof-retention] Could not delete the proof of verification request ${request.id} (${reason}); it will be retried.`);
    }
  }
}

/** Deletes the proof files of a member whose membership has just been decided. */
export function discardProofsForUser(userId: string): Promise<void> {
  return discardProofs({ userId });
}

/** Retries deleting proofs of decided requests that an earlier attempt could not remove. */
export function discardDecidedProofs(limit = 50): Promise<void> {
  return discardProofs({}, limit);
}
