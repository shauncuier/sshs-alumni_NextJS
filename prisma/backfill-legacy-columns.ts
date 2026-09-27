import "dotenv/config";
import { prisma } from "../lib/prisma";

// Databases created by the old hand-written DDL (scripts/migrate.js) carry
// duplicate columns that the schema no longer declares. The old raw SQL seed
// wrote only to those legacy columns, so copy their values into the canonical
// columns before `prisma db push` drops them. Safe to re-run: a no-op once the
// legacy columns are gone or on a fresh database.

async function columnsOf(table: string): Promise<Set<string>> {
  const rows: { COLUMN_NAME: string }[] = await prisma.$queryRaw`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table}`;
  return new Set(rows.map((r) => r.COLUMN_NAME));
}

async function main() {
  const event = await columnsOf("Event");
  if (event.has("bannerUrl")) {
    const n = await prisma.$executeRawUnsafe(
      "UPDATE `Event` SET `bannerImage` = `bannerUrl` WHERE `bannerImage` IS NULL AND `bannerUrl` IS NOT NULL"
    );
    console.log(`Event.bannerUrl -> bannerImage: ${n} row(s)`);
  }
  if (event.has("totalSeats")) {
    // maxAttendees still at its column default means it was never written.
    const n = await prisma.$executeRawUnsafe(
      "UPDATE `Event` SET `maxAttendees` = `totalSeats` WHERE `maxAttendees` = 500 AND `totalSeats` <> 500"
    );
    console.log(`Event.totalSeats -> maxAttendees: ${n} row(s)`);
  }
  if (event.has("confirmedSeats")) {
    const n = await prisma.$executeRawUnsafe(
      "UPDATE `Event` SET `attendeesCount` = `confirmedSeats` WHERE `confirmedSeats` > `attendeesCount`"
    );
    console.log(`Event.confirmedSeats -> attendeesCount: ${n} row(s)`);
  }

  const campaign = await columnsOf("DonationCampaign");
  if (campaign.has("imageUrl")) {
    const n = await prisma.$executeRawUnsafe(
      "UPDATE `DonationCampaign` SET `bannerImage` = `imageUrl` WHERE `bannerImage` IS NULL AND `imageUrl` IS NOT NULL"
    );
    console.log(`DonationCampaign.imageUrl -> bannerImage: ${n} row(s)`);
  }
  if (campaign.has("targetAmount")) {
    const n = await prisma.$executeRawUnsafe(
      "UPDATE `DonationCampaign` SET `goalAmount` = `targetAmount` WHERE `goalAmount` = 0 AND `targetAmount` <> 0"
    );
    console.log(`DonationCampaign.targetAmount -> goalAmount: ${n} row(s)`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Legacy column backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
