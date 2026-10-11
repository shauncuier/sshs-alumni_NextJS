import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { requestPhoneOtp } from "@/lib/phone-otp";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";

// Texts a one-time code to the phone a new member is registering with.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "phone-otp-send", { limit: 10, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    return NextResponse.json(await requestPhoneOtp(body.phone));
  } catch (err) {
    return errorResponse(err, "POST /api/auth/phone-otp");
  }
}
