import { NextResponse } from "next/server";
import { getContactPhones } from "@/lib/contact-phones";

// GET /api/contact-phones — the association's contact numbers for the footer and contact page
// (the footer also renders inside client pages, so it reads them from here).
export async function GET() {
  return NextResponse.json({ phones: await getContactPhones() }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=600" } });
}
