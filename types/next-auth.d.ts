import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      status?: string;
      batchYear?: number;
      sessionVersion?: number;
    };
  }

  interface User {
    id: string;
    role?: string;
    status?: string;
    batchYear?: number;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    status?: string;
    batchYear?: number;
    sessionVersion?: number;
  }
}
