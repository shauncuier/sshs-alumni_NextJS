import React from "react";
import { forbidden, unauthorized } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

// Server-side gate for the whole admin console. proxy.ts already sends signed-out
// visitors to /login; here a signed-in member without an admin role gets the 403
// page (app/forbidden.tsx) instead of being silently redirected elsewhere.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) unauthorized();
  if (!isAdminRole(user.role)) forbidden();

  return <AdminShell user={{ email: user.email, role: user.role }}>{children}</AdminShell>;
}
