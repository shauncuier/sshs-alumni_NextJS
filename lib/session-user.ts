import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface SessionUser {
  id: string;
  email: string;
  role: string;
}

/**
 * The signed-in member, or null. APIs that act on a member's own data must take
 * the identity from here, never from a userId in the request, which anyone can forge.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id || !user.email) return null;
  return { id: user.id, email: user.email, role: user.role ?? "ALUMNI" };
}

export function isAdminRole(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
