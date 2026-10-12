import type { Metadata } from "next";
import { forbidden, unauthorized } from "next/navigation";
import { getSessionUser } from "@/lib/session-user";
import { can } from "@/lib/permissions";

// The project presentation deck is for the committee, not the public.
export const metadata: Metadata = { title: "Project presentation", robots: { index: false, follow: false } };

export default async function PresentationLayout({ children }: { children: React.ReactNode }) {
  const me = await getSessionUser();
  if (!me) unauthorized();
  if (!can(me.role, "dashboard")) forbidden();
  return children;
}
