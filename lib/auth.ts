import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { accountAccessBlock, LEGACY_PENDING_MESSAGE } from "@/lib/account-access";
import { hasPendingMembershipPayment } from "@/lib/events/membership";
import { consumeRateLimit, resetRateLimit } from "@/lib/request-security";

export async function authorizeCredentials(credentials: Record<"email" | "password", string> | undefined) {
  if (!credentials?.email || !credentials?.password) {
    throw new Error("Please enter your email and password.");
  }

  const email = credentials.email.trim().toLowerCase();
  const rateLimitKey = `login:${email}`;
  if (!consumeRateLimit(rateLimitKey, { limit: 10, windowMs: 15 * 60_000 })) {
    throw new Error("Too many sign-in attempts. Please try again later.");
  }

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

  resetRateLimit(rateLimitKey);

  const block = accountAccessBlock(user);
  if (block?.code === "PENDING_APPROVAL") {
    let paymentUnderReview: boolean;
    try {
      paymentUnderReview = await hasPendingMembershipPayment(prisma, user.id);
    } catch (dbError) {
      console.error("Sign-in membership lookup failed:", dbError);
      throw new Error("Sign-in is temporarily unavailable. Please try again shortly.");
    }
    // No membership payment to review: an old free sign-up that never paid.
    if (!paymentUnderReview) throw new Error(LEGACY_PENDING_MESSAGE);
  }
  if (block) throw new Error(block.message);

  return {
    id: user.id,
    email: user.email,
    name: user.profile?.fullName || user.email.split("@")[0],
    role: user.role,
    status: user.status,
    image: user.profile?.avatarUrl || "/logo.png",
    batchYear: user.profile?.sscBatch || 2015,
    sessionVersion: user.sessionVersion,
  };
}

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
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
        token.status = (user as unknown as { status: string }).status;
        token.batchYear = (user as unknown as { batchYear: number }).batchYear;
        token.sessionVersion = (user as unknown as { sessionVersion: number }).sessionVersion ?? 0;
      }
      if (typeof token.sessionVersion !== "number") {
        token.sessionVersion = 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { id: string }).id = ((token.id as string) || (token.sub as string)) ?? "";
        (session.user as unknown as { role: string }).role = token.role as string;
        (session.user as unknown as { status: string }).status = token.status as string;
        (session.user as unknown as { batchYear: number }).batchYear = token.batchYear as number;
        (session.user as unknown as { sessionVersion: number }).sessionVersion =
          typeof token.sessionVersion === "number" ? token.sessionVersion : 0;
      }
      return session;
    },
  },
};

export default authOptions;
