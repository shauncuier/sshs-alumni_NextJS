import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { accountAccessBlock } from "@/lib/account-access";

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
  if (accountAccessBlock({ role: session.user.role, status: session.user.status })) return null;
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
