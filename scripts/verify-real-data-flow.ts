import "dotenv/config";
import { prisma } from "../lib/prisma";

async function verifyAll() {
  console.log("=== 1. CHECKING FOR ANY LINGERING FAKE USERS ===");
  const fakePatterns = [
    "test@abc.com",
    "%tester%",
    "%proofcheck%",
    "%live.photo%",
    "%gate.attendee%",
    "%gate.moderator%",
  ];

  for (const pattern of fakePatterns) {
    const found = await prisma.user.findMany({
      where: { email: { contains: pattern.replace(/%/g, "") } },
    });
    if (found.length > 0) {
      console.error(`⚠️ Found fake user matching ${pattern}:`, found.map((u) => u.email));
      throw new Error(`Fake data still present: ${pattern}`);
    }
  }
  console.log("✅ Zero fake user accounts found!");

  console.log("\n=== 2. VERIFYING AUTHENTIC ALUMNI DATASET ===");
  const allUsers = await prisma.user.findMany({
    include: {
      profile: true,
      verificationRequests: true,
      eventRegistrations: { include: { event: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Total users in system: ${allUsers.length}`);
  for (const u of allUsers) {
    const hasPhoto = Boolean(
      u.profile?.avatarUrl &&
      u.profile.avatarUrl !== "/logo.png" &&
      !u.profile.avatarUrl.includes("placeholder")
    );
    console.log(
      `• [${u.role}] ${u.profile?.fullName ?? "No Profile"} (${u.email}) | Batch: ${u.profile?.sscBatch ?? "N/A"} | Status: ${u.status} | HasValidPhoto: ${hasPhoto}`
    );
  }

  console.log("\n=== 3. VERIFYING DUAL VERIFICATION QUEUE (PAYMENT & DOCS) ===");
  const pendingRequests = await prisma.verificationRequest.findMany({
    where: { status: "PENDING" },
    include: {
      user: {
        include: {
          profile: true,
          eventRegistrations: {
            where: { event: { isMembershipEvent: true } },
          },
        },
      },
    },
  });

  console.log(`Pending verification queue count: ${pendingRequests.length}`);
  if (pendingRequests.length !== 4) {
    throw new Error(`Expected exactly 4 pending requests, got ${pendingRequests.length}`);
  }

  for (const r of pendingRequests) {
    const reg = r.user.eventRegistrations[0];
    const hasPhoto = Boolean(
      r.user.profile?.avatarUrl &&
      r.user.profile.avatarUrl !== "/logo.png" &&
      !r.user.profile.avatarUrl.includes("placeholder")
    );
    console.log(`  - Applicant: ${r.user.profile?.fullName}`);
    console.log(`    Batch: ${r.sscBatch}, Roll: ${r.rollNumber}`);
    console.log(`    Proof: ${r.proofType} ("${r.proofNote}")`);
    console.log(`    Valid Photo: ${hasPhoto} (Avatar: ${r.user.profile?.avatarUrl})`);
    console.log(`    Payment: ${reg ? `${reg.paymentMethod} - ${reg.transactionId} (Tk ${reg.totalFee})` : "None"}`);
    
    // Check the mandatory photo rule
    if (r.user.email === "shahriar.niloy@hotmail.com") {
      if (hasPhoto) {
        throw new Error("Shahriar was expected to have placeholder photo for mandatory photo test!");
      }
      console.log(`    --> Correctly flagged: Missing mandatory profile picture!`);
    } else {
      if (!hasPhoto) {
        throw new Error(`Expected ${r.user.email} to have a valid photo!`);
      }
    }
  }

  console.log("\n=== 4. VERIFYING JUBILEE MEMBERSHIP EVENT LINKAGE ===");
  const jubilee = await prisma.event.findFirst({
    where: { isMembershipEvent: true },
    include: { registrations: true },
  });

  if (!jubilee) {
    throw new Error("Jubilee membership event not found!");
  }

  console.log(`Jubilee Event: "${jubilee.title}"`);
  console.log(`Total registrations: ${jubilee.registrations.length}`);
  const confirmed = jubilee.registrations.filter((r) => r.status === "CONFIRMED");
  const pendingPayment = jubilee.registrations.filter((r) => r.status === "PENDING_PAYMENT");
  console.log(`Confirmed: ${confirmed.length}, Pending Payment: ${pendingPayment.length}`);

  if (confirmed.length !== 4 || pendingPayment.length !== 4) {
    throw new Error(`Expected 4 confirmed and 4 pending payments, got ${confirmed.length} and ${pendingPayment.length}`);
  }

  console.log("\n🎉 ALL CHECKS PASSED PERFECTLY!");
}

verifyAll()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
