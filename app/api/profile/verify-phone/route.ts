import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { verifyOwnPhone } from "@/lib/phone-reminder";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

// POST /api/profile/verify-phone { phoneVerificationToken }: the signed-in member proves
// the mobile number already on their profile with an SMS code (optional; lib/phone-reminder.ts).
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "verify-own-phone", { limit: 10, windowMs: 60 * 60_000 });
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const body = await readJsonBody(req);
    const phoneVerifiedAt = await verifyOwnPhone(me.id, body?.phoneVerificationToken);
    await logActivity({ category: "ACCOUNT", action: "profile.phone_verified", summary: `Verified the mobile number on their profile`, actor: me, targetType: "User", targetId: me.id, req });
    return NextResponse.json({ phoneVerifiedAt });
  } catch (err) {
    return errorResponse(err, "POST /api/profile/verify-phone");
  }
}
