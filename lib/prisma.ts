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
    findUnique: async () => null,
    upsert: async (args: any) => args.create,
    update: async (args: any) => args.data,
  };
  donation = {
    findMany: async () => [],
    findUnique: async () => null,
    create: async (args: any) => ({ id: `mock-donation-${Date.now()}`, ...args.data }),
    update: async (args: any) => args.data,
    updateMany: async () => ({ count: 0 }),
  };
  paymentTransaction = {
    findMany: async () => [],
    findUnique: async () => null,
    findFirst: async () => null,
    create: async (args: any) => ({ id: `mock-tx-${Date.now()}`, ...args.data }),
    update: async (args: any) => args.data,
  };
  message = {
    findMany: async () => [],
    findUnique: async () => null,
    create: async (args: any) => ({ id: `mock-msg-${Date.now()}`, createdAt: new Date(), ...args.data }),
    updateMany: async () => ({ count: 0 }),
  };
  notification = {
    findMany: async () => [],
    findUnique: async () => null,
    create: async (args: any) => ({ id: `mock-notif-${Date.now()}`, createdAt: new Date(), ...args.data }),
    updateMany: async () => ({ count: 0 }),
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
