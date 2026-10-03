import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { accountAccessBlock } from "@/lib/account-access";
import prisma from "@/lib/prisma";

export interface SessionUser {
  id: string;
  email: string;
  role: string;
}

/**
 * The NextAuth session, or null when there is none or it belongs to a pending or
 * rejected member (a token issued before approval). Use instead of getServerSession
 * in member-facing routes that read other session fields.
 */
export async function getMemberSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const userId = session.user.id;
  const userEmail = session.user.email;
  if (!userId && !userEmail) return null;
  const currentSessionVersion = typeof session.user.sessionVersion === "number" ? session.user.sessionVersion : 0;
  const current = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, status: true, sessionVersion: true },
      })
    : userEmail
    ? await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true, role: true, status: true, sessionVersion: true },
      })
    : null;
  const dbVersion = (current as { sessionVersion?: number })?.sessionVersion ?? 0;
  if (!current || dbVersion !== currentSessionVersion) return null;
  if (accountAccessBlock(current)) return null;
  session.user.id = current.id || userId || session.user.id;
  session.user.role = current.role;
  session.user.status = current.status;
  return session;
}

/**
 * The signed-in member, or null. APIs that act on a member's own data must take
 * the identity from here, never from a userId in the request, which anyone can forge.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getMemberSession();
  const user = session?.user;
  if (!user?.id || !user.email) return null;
  return { id: user.id, email: user.email, role: user.role ?? "ALUMNI" };
}

export function isAdminRole(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Roles that may use the gate scanner and check event tickets in: admins plus moderators (gate volunteers). */
export const GATE_ROLES = ["ADMIN", "SUPER_ADMIN", "MODERATOR"] as const;

export function isGateRole(role: string): boolean {
  return (GATE_ROLES as readonly string[]).includes(role);
}
