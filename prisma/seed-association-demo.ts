import "../lib/load-env";
import { prisma } from "../lib/prisma";
import { seedAssociationDemo } from "./demo-association";

// npm run db:seed:association-demo — sample committee, President's message, notices,
// honor board and constitution for trying the site (see prisma/demo-association.ts).
// Remove it all with npm run db:remove-demo once the real content is in.
async function main() {
  const added = await seedAssociationDemo();
  for (const [what, n] of Object.entries(added)) console.log(`Sample ${what}: ${n}`);
}

main()
  .catch((e) => {
    console.error("Adding the sample association content failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
