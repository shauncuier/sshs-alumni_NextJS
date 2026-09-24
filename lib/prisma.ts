/* eslint-disable @typescript-eslint/no-explicit-any */
let PrismaClientClass: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const prismaPkg = require("@prisma/client");
  PrismaClientClass = prismaPkg.PrismaClient;
} catch {
  // Safe runtime fallback
  PrismaClientClass = null;
}

class SafePrismaFallback {
  user = {
    findUnique: async () => null,
    create: async (args: any) => ({ id: "mock-user-id", ...args.data }),
    findMany: async () => [],
    upsert: async (args: any) => ({ id: "mock-user-id", ...args.create }),
  };
  alumniProfile = {
    findMany: async () => [],
    findUnique: async () => null,
    create: async (args: any) => args.data,
  };
  batch = {
    findMany: async () => [],
    upsert: async (args: any) => args.create,
  };
  event = {
    findMany: async () => [],
    upsert: async (args: any) => args.create,
  };
  donationCampaign = {
    findMany: async () => [],
    upsert: async (args: any) => args.create,
  };
  verificationRequest = {
    findMany: async () => [],
    create: async (args: any) => args.data,
  };
  $connect = async () => {};
  $disconnect = async () => {};
}

const globalForPrisma = globalThis as unknown as {
  prisma: any;
};

let clientInstance: any = null;
try {
  if (PrismaClientClass) {
    clientInstance = new PrismaClientClass();
  } else {
    clientInstance = new SafePrismaFallback();
  }
} catch {
  clientInstance = new SafePrismaFallback();
}

export const prisma = globalForPrisma.prisma ?? clientInstance;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
