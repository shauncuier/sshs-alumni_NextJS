import { NextResponse } from "next/server";
import { checkDatabase } from "@/lib/db-watchdog";
import { currentMode, standbyConfigured } from "@/lib/db-mode";
import { standbyClient } from "@/lib/prisma";

/**
 * GET /api/health: for an outside uptime monitor and the site's own outage notice.
 * 200 when the site can read its main database, 503 when it cannot (lib/db-watchdog.ts).
 * Says why in one word, never the error text, and which database pages read:
 * "primary", or "standby" while the read-only copy stands in (lib/db-mode.ts), with
 * `standbyOk` saying whether that copy answers. Each check at most once per 30 seconds
 * per server process, however often it is called.
 */
export const dynamic = "force-dynamic";

let last: { at: number; ok: boolean; reason?: string } | null = null;
let standbyLast: { at: number; ok: boolean } | null = null;
const CACHE_MS = 30_000;

async function standbyAnswers(): Promise<boolean> {
  if (!standbyLast || Date.now() - standbyLast.at > CACHE_MS) {
    let ok = false;
    try {
      await standbyClient()?.user.findFirst({ select: { id: true } });
      ok = true;
    } catch {
      ok = false;
    }
    standbyLast = { at: Date.now(), ok };
  }
  return standbyLast.ok;
}

export async function GET() {
  const mode = currentMode();
  // On the standby the main database is known to be down, and lib/db-mode.ts already tries
  // it every 30 seconds: answer at once rather than wait for another failed connection.
  if (mode === "standby") {
    if (!last || last.ok) last = { at: Date.now(), ok: false, reason: "database-unavailable" };
  } else if (!last || Date.now() - last.at > CACHE_MS) {
    const status = await checkDatabase();
    last = status.ok ? { at: Date.now(), ok: true } : { at: Date.now(), ok: false, reason: status.reason === "permission" ? "database-permission" : "database-down" };
  }
  const body = {
    ok: last.ok,
    ...(last.ok ? {} : { reason: last.reason }),
    mode,
    standby: standbyConfigured(),
    ...(mode === "standby" ? { standbyOk: await standbyAnswers() } : {}),
  };
  return NextResponse.json(body, { status: last.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
