import { afterEach, beforeEach, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { backfillEventJsonColumns } from "@/prisma/backfill-events";
import { makeEvent, resetDatabase } from "../helpers/db";

beforeEach(resetDatabase);

// Mimic a database where `db push` added the JSON columns to rows that already
// existed: allow NULL for the duration of the test, then restore NOT NULL.
const COLUMNS = ["agenda", "highlights", "packages"];
async function setJsonColumnsNullable(nullable: boolean) {
  for (const c of COLUMNS) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`Event\` MODIFY \`${c}\` JSON ${nullable ? "NULL" : "NOT NULL"}`);
  }
}
afterEach(async () => {
  await prisma.$executeRawUnsafe("DELETE FROM `Event`");
  await setJsonColumnsNullable(false);
});

it("repairs events whose JSON list columns are empty and leaves real content alone", async () => {
  const kept = await makeEvent({ agenda: [{ time: "09:00", activity: "Opening" }], highlights: ["Gala dinner"] });
  await setJsonColumnsNullable(true);
  await prisma.$executeRawUnsafe(
    "INSERT INTO `Event` (id, slug, title, description, date, venue, updatedAt, agenda, highlights, packages) " +
      "VALUES ('legacy-1', 'legacy-event', 'Legacy', 'd', NOW(3), 'v', NOW(3), NULL, CAST('null' AS JSON), NULL)"
  );

  expect(await backfillEventJsonColumns(prisma)).toBe(3);

  const legacy = await prisma.event.findUniqueOrThrow({ where: { id: "legacy-1" } });
  expect(legacy.agenda).toEqual([]);
  expect(legacy.highlights).toEqual([]);
  expect(legacy.packages).toEqual([]);
  const untouched = await prisma.event.findUniqueOrThrow({ where: { id: kept.id } });
  expect(untouched.agenda).toEqual([{ time: "09:00", activity: "Opening" }]);
  expect(untouched.highlights).toEqual(["Gala dinner"]);

  expect(await backfillEventJsonColumns(prisma)).toBe(0);
});
