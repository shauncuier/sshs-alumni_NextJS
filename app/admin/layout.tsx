import React from "react";
import { forbidden, unauthorized } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { getSessionUser } from "@/lib/session-user";
import { canUseAdminPanel } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-log";

// Server-side gate for the whole admin console. proxy.ts already sends signed-out
// visitors to /login; here a signed-in member whose role has no admin area gets
// the 403 page (app/forbidden.tsx). Which pages each role may open is checked in
// template.tsx, which runs on every navigation.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) unauthorized();
  if (!canUseAdminPanel(user.role)) {
    await logActivity({ category: "SECURITY", action: "admin.access_denied", status: "FAILURE", summary: `${user.email} (${user.role}) tried to open the admin panel`, actor: user });
    forbidden();
  }

  return <AdminShell user={{ email: user.email, role: user.role }}>{children}</AdminShell>;
}
