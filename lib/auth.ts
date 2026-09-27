import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // No fallback: NextAuth refuses to run in production without a secret, and a
  // secret published in the source would let anyone forge session tokens.
  secret: process.env.NEXTAUTH_SECRET,
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

        // Accounts live only in the database; there are no built-in fallback logins.
        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email },
            include: {
              profile: true,
            },
          });
        } catch (dbError) {
          console.error("Sign-in database lookup failed:", dbError);
          throw new Error("Sign-in is temporarily unavailable. Please try again shortly.");
        }

        if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
          throw new Error("Invalid email or password. Please verify your credentials.");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.fullName || user.email.split("@")[0],
          role: user.role,
          status: user.status,
          image: user.profile?.avatarUrl || "/logo.png",
          batchYear: user.profile?.sscBatch || 2015,
        };
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
