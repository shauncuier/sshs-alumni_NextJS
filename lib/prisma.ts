/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

let PrismaClientClass: any = null;
let PrismaMariaDbClass: any = null;

try {
  const clientPkg = require("@prisma/client");
  if (clientPkg?.PrismaClient) PrismaClientClass = clientPkg.PrismaClient;
} catch (e) {
  console.warn("Could not load @prisma/client:", e);
}

try {
  const adapterPkg = require("@prisma/adapter-mariadb");
  if (adapterPkg?.PrismaMariaDb) PrismaMariaDbClass = adapterPkg.PrismaMariaDb;
} catch (e) {
  console.warn("Could not load @prisma/adapter-mariadb:", e);
}

const globalForPrisma = globalThis as unknown as { prisma: any };

function createNotReadyProxy(): any {
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
                throw new Error(
                  `Database not ready: check database credentials or adapter setup. (accessing prisma.${String(prop)})`
                );
              };
            },
          }
        );
      },
    }
  );
}

function createClient(): any {
  if (!PrismaClientClass) return createNotReadyProxy();

  try {
    let adapter: any = undefined;
    if (PrismaMariaDbClass) {
      adapter = new PrismaMariaDbClass({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });
    }

    const options: any = {
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    };

    if (adapter) {
      options.adapter = adapter;
    }

    return new PrismaClientClass(options);
  } catch (err) {
    console.error("Failed to initialize PrismaClient:", err);
    return createNotReadyProxy();
  }
}

const clientInstance = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = clientInstance;
}

export const prisma = clientInstance;
export default prisma;
