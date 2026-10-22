import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Stands in for PrismaClient when it cannot be created, so imports still work
// and every query rejects with the reason instead of crashing at module load.
function createNotReadyProxy(reason: string): PrismaClient {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return undefined;
        return new Proxy(
          {},
          {
            get() {
              return async () => {
                throw new Error(`Database not ready: ${reason} (accessing prisma.${String(prop)})`);
              };
            },
          }
        );
      },
    }
  ) as unknown as PrismaClient;
}

function notReady(reason: string): { client: PrismaClient; ready: false } {
  console.error(`${reason} Database calls will fail.`);
  return { client: createNotReadyProxy(reason), ready: false };
}

// DATABASE_URL is the single source of truth, shared with prisma.config.ts.
// The adapter takes the URL as-is: it rewrites mysql:// to mariadb://, unwraps
// bracketed IPv6 hosts, and passes query parameters (e.g. ?ssl=true,
// ?connectionLimit=5, ?connectTimeout=10000) through as MariaDB pool options.
// MariaDB 11 (Hostinger) binds string parameters as utf8mb4_general_ci while literals
// follow the connection collation, so Prisma's `LIKE CONCAT(?, '%')` (startsWith,
// contains) fails with "Illegal mix of collations". Giving the session the same
// collation as the parameters fixes it; column collations still decide comparisons.
// Both options are appended as text: if the adapter has to add prepareCacheLength
// itself it re-encodes the query with '+' for spaces, which the driver does not decode.
const SESSION_SQL = "SET NAMES utf8mb4 COLLATE utf8mb4_general_ci";
export function withSessionCollation(databaseUrl: string): string {
  const params = new URL(databaseUrl).searchParams;
  if (params.has("initSql")) return databaseUrl;
  const extra = [`initSql=${encodeURIComponent(SESSION_SQL)}`];
  if (!params.has("prepareCacheLength")) extra.push("prepareCacheLength=0");
  return databaseUrl + (databaseUrl.includes("?") ? "&" : "?") + extra.join("&");
}

function createClient(): { client: PrismaClient; ready: boolean } {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return notReady("DATABASE_URL is not set.");

  let protocol: string;
  try {
    protocol = new URL(databaseUrl).protocol;
  } catch {
    return notReady("DATABASE_URL is not a valid URL.");
  }
  if (protocol !== "mysql:" && protocol !== "mariadb:") {
    return notReady(`DATABASE_URL must use mysql:// or mariadb://, got ${protocol}//.`);
  }

  try {
    const client = new PrismaClient({
      adapter: new PrismaMariaDb(withSessionCollation(databaseUrl)),
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    return { client, ready: true };
  } catch (err) {
    return notReady(`PrismaClient failed to initialize: ${(err as Error).message}`);
  }
}

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const { client, ready } = createClient();
  // Only reuse a working client across dev hot reloads. Caching the not-ready
  // proxy would keep failing after DATABASE_URL is fixed, until a restart.
  if (ready && process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

const clientInstance = getClient();

export const prisma = clientInstance;
export default prisma;
