import type { PrismaClient } from "@prisma/client";

// `prisma db push` adds Event.agenda/highlights/packages/guestTypes and
// EventRegistration.guests as NOT NULL JSON columns,
// but MySQL cannot give a JSON column a literal default — Prisma's @default("[]")
// is applied by the client on create only. Rows that already existed when the
// columns were added are therefore left empty (SQL NULL, JSON null, or '' on
// MariaDB, where JSON is LONGTEXT), and Prisma fails to read those events.
// Set them to an empty JSON array. Safe to re-run: a no-op once repaired.
const JSON_LIST_COLUMNS = [
  ["Event", "agenda"],
  ["Event", "highlights"],
  ["Event", "packages"],
  ["Event", "guestTypes"],
  ["Event", "batchFees"],
  ["EventRegistration", "guests"],
] as const;

export async function backfillEventJsonColumns(client: PrismaClient): Promise<number> {
  let total = 0;
  for (const [table, column] of JSON_LIST_COLUMNS) {
    total += await client.$executeRawUnsafe(
      `UPDATE \`${table}\` SET \`${column}\` = JSON_ARRAY() ` +
        `WHERE \`${column}\` IS NULL OR CAST(\`${column}\` AS CHAR) IN ('', 'null')`
    );
  }
  return total;
}
