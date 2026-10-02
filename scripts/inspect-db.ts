import "dotenv/config";
import { prisma } from "../lib/prisma";

async function inspect() {
  const users = await prisma.user.findMany({
    include: {
      profile: true,
      verificationRequests: true,
      eventRegistrations: true,
    },
  });
  console.log("=== TOTAL USERS IN DB:", users.length, "===");
  for (const u of users) {
    console.log({
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      fullName: u.profile?.fullName,
      batch: u.profile?.sscBatch,
      avatarUrl: u.profile?.avatarUrl,
      verifications: u.verificationRequests.length,
      registrations: u.eventRegistrations.length,
    });
  }

  const verifications = await prisma.verificationRequest.findMany({
    include: { user: { select: { email: true, profile: { select: { fullName: true } } } } },
  });
  console.log("=== TOTAL VERIFICATIONS:", verifications.length, "===");
  for (const v of verifications) {
    console.log({
      id: v.id,
      email: v.user.email,
      name: v.user.profile?.fullName,
      status: v.status,
      proofType: v.proofType,
      proofFileUrl: v.proofFileUrl,
    });
  }

  const registrations = await prisma.eventRegistration.findMany({
    include: { event: { select: { title: true, isMembershipEvent: true } } },
  });
  console.log("=== TOTAL REGISTRATIONS:", registrations.length, "===");
  for (const r of registrations) {
    console.log({
      id: r.id,
      eventTitle: r.event.title,
      isMembership: r.event.isMembershipEvent,
      status: r.status,
      fee: r.totalFee,
      trx: r.transactionId,
      method: r.paymentMethod,
    });
  }
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
