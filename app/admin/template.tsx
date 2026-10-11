import React from "react";
import { headers } from "next/headers";
import { forbidden, redirect, unauthorized } from "next/navigation";
import { getSessionUser } from "@/lib/session-user";
import { areaForPath, can, homeForRole } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-log";

// Runs on every admin navigation (a layout would not re-run between sibling
// pages), so a moderator cannot open an admin-only page even by typing its URL.
// The admin APIs check the same permissions again for every request.
export default async function AdminTemplate({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) unauthorized();
  const pathname = (await headers()).get("x-pathname") ?? "/admin";
  const area = areaForPath(pathname);
  // Pages without a known area are for full admins only.
  const allowed = area ? can(user.role, area) : can(user.role, "dashboard");
  if (!allowed) {
    if (area === "dashboard") redirect(homeForRole(user.role));
    await logActivity({ category: "SECURITY", action: "admin.page_denied", status: "FAILURE", summary: `${user.email} (${user.role}) tried to open ${pathname}`, actor: user, metadata: { path: pathname } });
    forbidden();
  }
  return <>{children}</>;
}
