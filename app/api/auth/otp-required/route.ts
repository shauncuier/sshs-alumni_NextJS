import { NextResponse } from "next/server";
import { otpRequired } from "@/lib/otp-setting";

// GET /api/auth/otp-required — whether the join and profile forms ask for a verification code.
export async function GET() {
  return NextResponse.json({ required: await otpRequired() }, { headers: { "Cache-Control": "no-store" } });
}
