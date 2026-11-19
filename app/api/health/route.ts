import { NextResponse } from "next/server";
import { checkDatabase } from "@/lib/db-watchdog";

/**
 * GET /api/health: for an outside uptime monitor. 200 when the site can read its
 * database, 503 when it cannot (lib/db-watchdog.ts). Says why in one word, never the
 * error text. One check per 30 seconds per server process, however often it is called.
 */
export const dynamic = "force-dynamic";

let last: { at: number; ok: boolean; reason?: string } | null = null;
const CACHE_MS = 30_000;

export async function GET() {
  if (!last || Date.now() - last.at > CACHE_MS) {
    const status = await checkDatabase();
    last = status.ok ? { at: Date.now(), ok: true } : { at: Date.now(), ok: false, reason: status.reason === "permission" ? "database-permission" : "database-down" };
  }
  return NextResponse.json(
    last.ok ? { ok: true } : { ok: false, reason: last.reason },
    { status: last.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
