import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { accountAccessBlock, LEGACY_PENDING_MESSAGE } from "@/lib/account-access";
import { hasPendingMembershipPayment } from "@/lib/events/membership";
import { consumeRateLimit, resetRateLimit } from "@/lib/request-security";
import { logActivity } from "@/lib/activity-log";
import { clientIp } from "@/lib/client-ip";
import { requireTurnstile } from "@/lib/turnstile";
import { currentMode } from "@/lib/db-mode";
import { canonicalPhone } from "@/lib/phone-registry";

export const SIGN_IN_PAUSED_MESSAGE =
  "Signing in is paused for a few minutes while we fix a problem with the database. If you are already signed in, you stay signed in.";

type AuthorizeRequest = { headers?: Record<string, string | string[] | undefined> } | undefined;
const header = (req: AuthorizeRequest, name: string) => {
  const v = req?.headers?.[name];
  return (Array.isArray(v) ? v[0] : v) ?? null;
};

export const INVALID_LOGIN_MESSAGE = "Invalid email/mobile number or password. Please check and try again.";
const TOO_MANY_ATTEMPTS_MESSAGE = "Too many sign-in attempts. Please try again later.";
const LOGIN_LIMIT = { limit: 10, windowMs: 15 * 60_000 };

type LoginIdentifier =
  | { kind: "email"; value: string; rateLimitKey: string }
  | { kind: "phone"; value: string; rateLimitKey: string }
  | { kind: "invalid"; value: string; rateLimitKey: string };

/**
 * What a member typed in the sign-in box: an email (it has an @) or a Bangladeshi mobile
 * number in any common form (01…, +8801…, 8801…, with spaces), read as 01XXXXXXXXX.
 */
export function loginIdentifier(raw: string): LoginIdentifier {
  const text = raw.trim().toLowerCase();
  if (text.includes("@")) return { kind: "email", value: text, rateLimitKey: `login:${text}` };
  try {
    const phone = canonicalPhone(text);
    return { kind: "phone", value: phone, rateLimitKey: `login:phone:${phone}` };
  } catch {
    return { kind: "invalid", value: text, rateLimitKey: `login:${text}` };
  }
}

/**
 * The account whose profile holds this number. Older rows may store it as +8801… or with
 * spaces, so the last ten digits decide (as in lib/phone-registry.ts); anything other than
 * exactly one account counts as no match.
 */
async function findUserByPhone(phone: string) {
  const last10 = phone.slice(1);
  const rows = await prisma.alumniProfile.findMany({ where: { phone: { endsWith: last10 } }, select: { phone: true, userId: true }, take: 5 });
  const ids = [...new Set(rows.filter((r) => (r.phone ?? "").replace(/\D/g, "").endsWith(last10)).map((r) => r.userId))];
  if (ids.length !== 1) return null;
  return prisma.user.findUnique({ where: { id: ids[0] }, include: { profile: true } });
}

/** Signs a member in and records the attempt, successful or not, in the activity log. */
export async function authorizeCredentials(credentials: (Record<"email" | "password", string> & { turnstileToken?: string }) | undefined, req?: AuthorizeRequest) {
  // For the log: the email, or the mobile number as 01XXXXXXXXX.
  const email = credentials?.email?.trim() ? loginIdentifier(credentials.email).value : null;
  const context = {
    ip: clientIp((name) => header(req, name)),
    userAgent: header(req, "user-agent"),
  };
  try {
    // Robot check first: a bot gets no password guesses at all.
    await requireTurnstile(credentials?.turnstileToken, "login", context.ip);
    const user = await checkCredentials(credentials);
    await logActivity({ category: "AUTH", action: "auth.sign_in", summary: `${user.email} signed in`, actor: user, targetType: "User", targetId: user.id, ...context });
    return user;
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Sign-in failed";
    await logActivity({
      category: "AUTH",
      action: "auth.sign_in_failed",
      status: "FAILURE",
      summary: `Failed sign-in${email ? ` for ${email}` : ""}: ${reason}`,
      actor: email ? { email } : null,
      ...context,
    });
    throw err;
  }
}

async function checkCredentials(credentials: Record<"email" | "password", string> | undefined) {
  if (!credentials?.email || !credentials?.password) {
    throw new Error("Please enter your email and password.");
  }

  // On the standby copy (lib/db-mode.ts) no password hashes exist (lib/standby-sync.ts):
  // say so plainly instead of "invalid password". Members already signed in stay signed in.
  if (currentMode() === "standby") throw new Error(SIGN_IN_PAUSED_MESSAGE);

  const id = loginIdentifier(credentials.email);
  if (!consumeRateLimit(id.rateLimitKey, LOGIN_LIMIT)) throw new Error(TOO_MANY_ATTEMPTS_MESSAGE);
  if (id.kind === "invalid") throw new Error(INVALID_LOGIN_MESSAGE);

  // Accounts live only in the database; there are no built-in fallback logins.
  let user;
  try {
    user = id.kind === "email" ? await prisma.user.findUnique({ where: { email: id.value }, include: { profile: true } }) : await findUserByPhone(id.value);
  } catch (dbError) {
    console.error("Sign-in database lookup failed:", dbError);
    throw new Error("Sign-in is temporarily unavailable. Please try again shortly.");
  }

  // By phone, the attempt also counts against the account's email key, so switching
  // between the two never gives more guesses.
  const accountKey = user ? `login:${user.email.toLowerCase()}` : null;
  if (accountKey && accountKey !== id.rateLimitKey && !consumeRateLimit(accountKey, LOGIN_LIMIT)) {
    throw new Error(TOO_MANY_ATTEMPTS_MESSAGE);
  }

  if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
    throw new Error(INVALID_LOGIN_MESSAGE);
  }

  resetRateLimit(id.rateLimitKey);
  if (accountKey) resetRateLimit(accountKey);

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
        turnstileToken: { label: "Robot check", type: "text" },
      },
      authorize: authorizeCredentials,
    }),
  ],
  events: {
    async signOut({ token }) {
      await logActivity({
        category: "AUTH",
        action: "auth.sign_out",
        summary: `${token?.email ?? "A member"} signed out`,
        actor: { id: (token?.id as string | undefined) ?? token?.sub, email: token?.email, role: token?.role as string | undefined },
      });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (token.revoked && !user) return token; // signed out (see below) until a new sign-in
      if (user) {
        delete token.revoked;
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
        token.status = (user as unknown as { status: string }).status;
        token.batchYear = (user as unknown as { batchYear: number }).batchYear;
        token.sessionVersion = (user as unknown as { sessionVersion: number }).sessionVersion ?? 0;
      }
      if (typeof token.sessionVersion !== "number") {
        token.sessionVersion = 0;
      }
      if (!user) {
        // Every later read re-checks the account, so a session is either fully valid or
        // gone: never "signed in" in the menu (this cookie) but refused by pages and APIs
        // that check the database (getMemberSession). A stale one becomes { revoked } and
        // the session callback answers "signed out" (quietly: no error on every page, as a
        // thrown error would log). A role or status change applies at once.
        const id = (token.id as string | undefined) ?? token.sub;
        let current;
        try {
          current = id
            ? await prisma.user.findUnique({ where: { id }, select: { role: true, status: true, sessionVersion: true, disabledAt: true, profile: { select: { avatarUrl: true } } } })
            : null;
        } catch {
          // Database briefly unreachable: keep the session rather than sign everyone out.
          return token;
        }
        if (!current || current.sessionVersion !== token.sessionVersion || accountAccessBlock(current)) {
          return { revoked: true };
        }
        token.role = current.role;
        token.status = current.status;
        // The header photo follows the profile: a new or moved photo shows without signing in again.
        token.picture = current.profile?.avatarUrl || "/logo.png";
      }
      return token;
    },
    async session({ session, token }) {
      // A revoked session (see jwt above) is no session: an empty one reads as signed out.
      if (token.revoked) return {} as typeof session;
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
