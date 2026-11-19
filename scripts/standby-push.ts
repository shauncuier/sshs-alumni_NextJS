/**
 * Creates or updates the standby database's tables from prisma/schema.prisma
 * (`prisma db push` against STANDBY_DATABASE_URL). Run it once when setting up the
 * standby and again after every schema change, before the next copy.
 *   npm run standby:push
 * Never touches the main database. Refuses changes that would drop data on the standby
 * (Prisma asks for --accept-data-loss, which this script does not pass); in that case
 * empty the standby table by hand, push, then run `npm run standby:sync -- --full`.
 */
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const raw = process.env.STANDBY_DATABASE_URL?.trim();
if (!raw) {
  console.error("STANDBY_DATABASE_URL is not set.");
  process.exit(1);
}

const url = new URL(raw);
const main = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (main && main.host === url.host && main.pathname === url.pathname) {
  console.error("STANDBY_DATABASE_URL points at the main database. Refusing.");
  process.exit(1);
}

// Prisma's schema engine takes TLS as sslaccept=strict; drop the driver-style options.
for (const key of [...url.searchParams.keys()]) {
  if (/^(ssl|ssl[-_]?mode|sslaccept|connectionLimit|connectTimeout)$/i.test(key)) url.searchParams.delete(key);
}
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) url.searchParams.set("sslaccept", "strict");

console.log(`Pushing the schema to the standby at ${url.hostname}${url.pathname} …`);
const result = spawnSync("npx", ["prisma", "db", "push"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, DATABASE_URL: url.toString() },
});
process.exit(result.status ?? 1);
