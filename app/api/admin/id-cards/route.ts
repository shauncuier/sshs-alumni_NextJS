import { NextResponse } from "next/server";
import { AppError } from "@/lib/app-error";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { buildCardsFor, listCardCandidates, MAX_CARDS_PER_PRINT } from "@/lib/member-card";
import { publicOrigin } from "@/lib/request-origin";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

const requireCards = () => requireArea("alumni", "Only administrators can print membership cards.");

// GET /api/admin/id-cards?batch=2001&q=rahim — approved members a card can be printed for.
export async function GET(req: Request) {
  try {
    await requireCards();
    const url = new URL(req.url);
    const batch = Number(url.searchParams.get("batch")) || null;
    const members = await listCardCandidates({ batch, q: url.searchParams.get("q") });
    return NextResponse.json({ members });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/id-cards");
  }
}

// POST /api/admin/id-cards { userIds } — the chosen members' cards with fresh gate QR codes, to print.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireCards();
    const body = (await readJsonBody(req)) as { userIds?: unknown };
    const userIds = Array.isArray(body?.userIds) ? body.userIds.filter((v): v is string => typeof v === "string") : [];
    if (userIds.length === 0) throw new AppError("NO_MEMBERS", 400, "Choose at least one member.");
    if (userIds.length > MAX_CARDS_PER_PRINT) {
      throw new AppError("TOO_MANY", 400, `Print up to ${MAX_CARDS_PER_PRINT} cards at a time.`);
    }
    const cards = await buildCardsFor(userIds, publicOrigin(req));
    // Each printed card carries a valid gate pass, so record who printed whose.
    await logActivity({
      category: "ADMIN",
      action: "id_cards.printed",
      summary: `Printed ${cards.length} membership card${cards.length === 1 ? "" : "s"}`,
      actor: me,
      targetType: "User",
      metadata: { userIds: cards.map((c) => c.userId) },
      req,
    });
    return NextResponse.json({ cards, origin: publicOrigin(req) });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/id-cards");
  }
}
