import { NextResponse } from "next/server";
import { turnstileSiteKey } from "@/lib/turnstile";

// GET /api/auth/turnstile — the public widget key, or null while the robot check is off.
export async function GET() {
  return NextResponse.json({ siteKey: turnstileSiteKey() }, { headers: { "Cache-Control": "no-store" } });
}
