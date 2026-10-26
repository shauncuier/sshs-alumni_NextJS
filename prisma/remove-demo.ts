import "../lib/load-env";
import { prisma } from "../lib/prisma";
import { removeDemoContent } from "./seed-core";

// npm run db:remove-demo — deletes the sample posts, news, announcements, events and
// campaigns that npm run db:seed creates, and the sample committee, honor board,
// constitution and President's message from npm run db:seed:association-demo. Events with registrations and campaigns
// with donations are kept, and no account is deleted (disable test accounts in
// /admin/users). Take a backup first on a production database.
async function main() {
  const removed = await removeDemoContent();
  for (const [what, n] of Object.entries(removed)) console.log(`Removed ${n} demo ${what}.`);
}

main()
  .catch((e) => {
    console.error("Removing demo content failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
