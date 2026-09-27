/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as { prisma: any };

function createNotReadyProxy(reason: string): any {
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
  );
}

function notReady(reason: string): { client: any; ready: false } {
  console.error(`${reason} Database calls will fail.`);
  return { client: createNotReadyProxy(reason), ready: false };
}

// DATABASE_URL is the single source of truth, shared with prisma.config.ts.
// The adapter takes the URL as-is: it rewrites mysql:// to mariadb://, unwraps
// bracketed IPv6 hosts, and passes query parameters (e.g. ?ssl=true,
// ?connectionLimit=5, ?connectTimeout=10000) through as MariaDB pool options.
function createClient(): { client: any; ready: boolean } {
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
      adapter: new PrismaMariaDb(databaseUrl),
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    return { client, ready: true };
  } catch (err) {
    return notReady(`PrismaClient failed to initialize: ${(err as Error).message}`);
  }
}

function getClient(): any {
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
