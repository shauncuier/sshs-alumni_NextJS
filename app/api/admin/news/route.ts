import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { createNews, listAllNews, NEWS_CATEGORIES } from "@/lib/news";
import { readJsonBody, LARGE_JSON_BYTES, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

const requireAdmin = () => requireArea("news", "You cannot manage news.");

// GET /api/admin/news — every article, drafts first.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ articles: await listAllNews(), categories: NEWS_CATEGORIES });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/news");
  }
}

// POST /api/admin/news — write a new article (a draft unless isPublished is true).
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const article = await createNews(await readJsonBody(req, LARGE_JSON_BYTES), me.email);
    await logActivity({
      category: "CONTENT",
      action: article.isPublished ? "news.published" : "news.drafted",
      summary: `${article.isPublished ? "Published" : "Drafted"} news "${article.title}"`,
      actor: me,
      targetType: "NewsArticle",
      targetId: article.id,
      metadata: { category: article.category },
      req,
    });
    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/news");
  }
}
