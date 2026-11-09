import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { checkCoupon, eventDiscountOffer } from "@/lib/events/discounts";
import { getSessionUser } from "@/lib/session-user";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";

type Params = { params: Promise<{ slug: string }> };

// GET /api/events/[slug]/discounts — the automatic discounts running now, and whether a
// coupon code field is worth showing. Use counts and other coupons' codes are never sent.
export async function GET(_req: Request, { params }: Params) {
  try {
    return NextResponse.json(await eventDiscountOffer((await params).slug));
  } catch (err) {
    return errorResponse(err, "GET /api/events/[slug]/discounts");
  }
}

// POST /api/events/[slug]/discounts { code } — the registration form's "Apply" button.
// The registration itself checks the code again (lib/events/registrations.ts).
export async function POST(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    // Few tries per address, so codes can't be guessed by trying many.
    requireRateLimit(req, "coupon-check", { limit: 20, windowMs: 15 * 60_000 });
    const me = await getSessionUser();
    const body = (await readJsonBody(req)) as { code?: unknown };
    const coupon = await checkCoupon((await params).slug, body?.code, me?.id ?? null);
    return NextResponse.json({ coupon });
  } catch (err) {
    return errorResponse(err, "POST /api/events/[slug]/discounts");
  }
}
