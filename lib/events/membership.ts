import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

/** True while the member's joining (membership event) payment is unconfirmed. */
export async function hasPendingMembershipPayment(
  db: Prisma.TransactionClient | typeof prisma,
  userId: string
): Promise<boolean> {
  const count = await db.eventRegistration.count({
    where: { userId, status: "PENDING_PAYMENT", event: { isMembershipEvent: true } },
  });
  return count > 0;
}
