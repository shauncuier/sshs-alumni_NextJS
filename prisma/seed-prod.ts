import "../lib/load-env";
import { prisma } from "../lib/prisma";
import { envSuperAdminEmail } from "../lib/admin/super-admin";
import { runProductionSeed } from "./seed-core";

// npm run db:seed:prod — safe on the production database: creates the SSC batches,
// the super admin (SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD) and the membership
// event, and nothing else. No test accounts, no sample posts, news or campaigns.
// Existing rows are never overwritten, so it can be re-run at any time.
async function main() {
  console.log("Seeding the production database (batches, super admin, membership event, sponsors)...");
  const r = await runProductionSeed();
  console.log(`Super admin ${envSuperAdminEmail()}: ${r.superAdmin}`);
  console.log(`SSC batches created: ${r.batchesCreated}`);
  if (r.renamedRows) console.log(`Renamed the association in ${r.renamedRows} row(s).`);
  for (const name of r.sponsorsAdded) console.log(`Added sponsor ${name} (edit it in /admin/sponsors).`);
  console.log(r.membershipEventCreated ? "Membership event created. Add its payment instructions in /admin/events before opening joining." : "Membership event already exists; left unchanged.");
  if (r.repaired.eventJson || r.repaired.registrations) {
    console.log(`Repaired ${r.repaired.eventJson} event JSON value(s) and ${r.repaired.registrations} legacy free registration(s).`);
  }
  for (const email of r.lockedLegacyAccounts) {
    console.log(`Disabled ${email}: it still had the old published default password.`);
  }
  for (const w of r.warnings) console.warn(`Warning: ${w}`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error("Production seed failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
