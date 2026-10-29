import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { requireArea } from "@/lib/admin/require-admin";
import { listMagazinePosts } from "@/lib/magazine";

// GET /api/admin/feed?source=feed|form&q=&from=&to=&page= — feed posts (or public-form writings) as text for the paper
// magazine, newest first. Admins and feed moderators.
export async function GET(req: Request) {
  try {
    await requireArea("feed");
    const p = new URL(req.url).searchParams;
    const result = await listMagazinePosts({ source: p.get("source"), q: p.get("q"), from: p.get("from"), to: p.get("to"), page: Number(p.get("page")) || 1 });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err, "GET /api/admin/feed");
  }
}
