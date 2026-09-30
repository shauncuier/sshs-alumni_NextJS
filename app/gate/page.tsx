import type { Metadata } from "next";
import { forbidden, unauthorized } from "next/navigation";
import GateScanner from "@/components/gate/GateScanner";
import { getSessionUser, isGateRole } from "@/lib/session-user";

export const metadata: Metadata = { title: "Gate Scanner" };

// The gate scanner lives outside /admin because moderators (gate volunteers) use
// it too; every other admin page stays admin-only via app/admin/layout.tsx.
// proxy.ts sends signed-out visitors to /login; this is the server-side role check.
export default async function GatePage() {
  const user = await getSessionUser();
  if (!user) unauthorized();
  if (!isGateRole(user.role)) forbidden();

  return <GateScanner />;
}
