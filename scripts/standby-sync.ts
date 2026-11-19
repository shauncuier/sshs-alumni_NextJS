/**
 * Copies the main database to the standby once (lib/standby-sync.ts).
 *   npm run standby:sync            what changed since the last run
 *   npm run standby:sync -- --full  every row again (first copy, or repair)
 * Needs DATABASE_URL and STANDBY_DATABASE_URL. Run `npm run standby:push` first so the
 * standby has the tables.
 */
import dotenv from "dotenv";

// The standby URL lives in .env.standby (never read by the dev server); the rest as usual.
dotenv.config({ path: ".env.standby", quiet: true });
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

async function main() {
  if (!process.env.STANDBY_DATABASE_URL?.trim()) {
    console.error("STANDBY_DATABASE_URL is not set.");
    process.exit(1);
  }
  const { runStandbySync } = await import("../lib/standby-sync");
  const full = process.argv.includes("--full");
  const result = await runStandbySync({ full });
  for (const t of result.tables) {
    const what = t.error ? `ERROR ${t.error}` : `${t.mode}, ${t.rows} rows, ${t.written} written, ${t.deleted} deleted`;
    console.log(`${t.table.padEnd(28)} ${what}`);
  }
  console.log(result.ran ? `Done in ${result.ms} ms: ${result.written} written, ${result.deleted} deleted, ~${Math.round(result.bytes / 1024)} KB.` : `Not run: ${result.reason}`);
  process.exit(result.ran && !result.tables.some((t) => t.error) ? 0 : 1);
}

main();
