import { NextResponse } from "next/server";
import { AppError } from "@/lib/app-error";

/** Turns an AppError into its JSON response; logs anything else and returns a generic 500. */
export function errorResponse(err: unknown, context: string): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  console.error(`[${context}]`, err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
