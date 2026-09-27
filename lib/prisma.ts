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

// DATABASE_URL is the single source of truth, shared with prisma.config.ts.
// The MariaDB driver only accepts the mariadb:// scheme, so parse the
// mysql:// URL into a pool config instead of passing it through.
function adapterFromUrl(databaseUrl: string): PrismaMariaDb {
  const url = new URL(databaseUrl);
  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
  });
}

function createClient(): any {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set; database calls will fail.");
    return createNotReadyProxy("DATABASE_URL is not set.");
  }

  try {
    return new PrismaClient({
      adapter: adapterFromUrl(databaseUrl),
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  } catch (err) {
    console.error("Failed to initialize PrismaClient:", err);
    return createNotReadyProxy(`PrismaClient failed to initialize: ${(err as Error).message}`);
  }
}

const clientInstance = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = clientInstance;
}

export const prisma = clientInstance;
export default prisma;
