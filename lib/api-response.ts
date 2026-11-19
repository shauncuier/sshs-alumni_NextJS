import { NextResponse } from "next/server";
import { AppError } from "@/lib/app-error";
import { DB_UNAVAILABLE_MESSAGE, isDbUnavailable } from "@/lib/db-errors";

/**
 * Turns an AppError into its JSON response. A database outage (lib/db-errors.ts) becomes
 * a 503 that says to try again shortly; anything else is logged and returns a generic 500.
 */
export function errorResponse(err: unknown, context: string): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  if (isDbUnavailable(err)) {
    console.error(`[${context}] Database unavailable:`, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: DB_UNAVAILABLE_MESSAGE, code: "DB_UNAVAILABLE" }, { status: 503, headers: { "Retry-After": "120" } });
  }
  console.error(`[${context}]`, err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
