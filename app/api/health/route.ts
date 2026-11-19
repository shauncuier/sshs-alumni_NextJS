import { NextResponse } from "next/server";
import { checkDatabase } from "@/lib/db-watchdog";
import { currentMode, standbyConfigured } from "@/lib/db-mode";

/**
 * GET /api/health: for an outside uptime monitor and the site's own outage notice.
 * 200 when the site can read its main database, 503 when it cannot (lib/db-watchdog.ts).
 * Says why in one word, never the error text, and which database pages read:
 * "primary", or "standby" while the read-only copy stands in (lib/db-mode.ts).
 * One check per 30 seconds per server process, however often it is called.
 */
export const dynamic = "force-dynamic";

let last: { at: number; ok: boolean; reason?: string } | null = null;
const CACHE_MS = 30_000;

export async function GET() {
  // On the standby the main database is known to be down, and lib/db-mode.ts already tries
  // it every 30 seconds: answer at once rather than wait for another failed connection.
  if (currentMode() === "standby") {
    if (!last || last.ok) last = { at: Date.now(), ok: false, reason: "database-unavailable" };
  } else if (!last || Date.now() - last.at > CACHE_MS) {
    const status = await checkDatabase();
    last = status.ok ? { at: Date.now(), ok: true } : { at: Date.now(), ok: false, reason: status.reason === "permission" ? "database-permission" : "database-down" };
  }
  const mode = currentMode();
  const body = { ok: last.ok, ...(last.ok ? {} : { reason: last.reason }), mode, standby: standbyConfigured() };
  return NextResponse.json(body, { status: last.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
