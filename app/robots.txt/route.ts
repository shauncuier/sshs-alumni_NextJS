import { siteOrigin } from "@/lib/seo";

/**
 * robots.txt as a route rather than app/robots.ts, because the metadata helper cannot
 * write the Content-Signal line (https://contentsignals.org): search engines and AI
 * answers may use the pages, but not to train models.
 */
export const dynamic = "force-static";

export function GET() {
  const body = [
    "User-agent: *",
    "Content-Signal: search=yes, ai-input=yes, ai-train=no",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /api/",
    "Disallow: /settings/",
    "Disallow: /dashboard/",
    "",
    `Sitemap: ${siteOrigin()}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
