import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { getFeaturedSponsor } from "@/lib/sponsors";

// GET /api/sponsors/featured — the website infrastructure sponsor credited in the footer
// (the footer also renders inside client pages, so it reads the sponsor from here).
export async function GET() {
  try {
    const s = await getFeaturedSponsor();
    const sponsor = s && { name: s.name, nameEn: s.nameEn, address: s.address, logoUrl: s.logoUrl };
    return NextResponse.json({ sponsor }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
  } catch (err) {
    return errorResponse(err, "GET /api/sponsors/featured");
  }
}
