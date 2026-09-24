import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "sabuj-shikshayatan-alumni-production-secret-key-2026",
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "SSGHS Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "alumnus@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter your email and password.");
        }

        const email = credentials.email.trim().toLowerCase();

        // 1. Try to fetch user from database
        try {
          const user = await prisma.user.findUnique({
            where: { email },
            include: {
              profile: true,
            },
          });

          if (user && user.passwordHash) {
            const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
            if (isValid) {
              return {
                id: user.id,
                email: user.email,
                name: user.profile?.fullName || user.email.split("@")[0],
                role: user.role,
                status: user.status,
                image: user.profile?.avatarUrl || "/logo.png",
                batchYear: user.profile?.sscBatch || 2015,
              };
            }
          }
        } catch (dbError) {
          console.warn("Database lookup failed or not connected yet, trying fallback accounts:", dbError);
        }

        // 2. Demo Fallback Accounts (ensures seamless UI testing even before local MongoDB is seeded)
        if (email === "jashedul@example.com" && credentials.password === "password123") {
          return {
            id: "demo-alumni-id-2008",
            email: "jashedul@example.com",
            name: "Md. Jashedul Hoque",
            role: "ALUMNI",
            status: "VERIFIED",
            image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
            batchYear: 2008,
          };
        }

        if (email === "admin@sabujsghs.edu.bd" && credentials.password === "admin123") {
          return {
            id: "demo-admin-id-master",
            email: "admin@sabujsghs.edu.bd",
            name: "SSGHS Executive Secretariat",
            role: "ADMIN",
            status: "VERIFIED",
            image: "/logo.png",
            batchYear: 1995,
          };
        }

        throw new Error("Invalid email or password. Please verify your credentials.");
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
        token.status = (user as unknown as { status: string }).status;
        token.batchYear = (user as unknown as { batchYear: number }).batchYear;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { id: string }).id = token.id as string;
        (session.user as unknown as { role: string }).role = token.role as string;
        (session.user as unknown as { status: string }).status = token.status as string;
        (session.user as unknown as { batchYear: number }).batchYear = token.batchYear as number;
      }
      return session;
    },
  },
};

export default authOptions;
