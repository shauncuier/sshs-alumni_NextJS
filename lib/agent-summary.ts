import { schoolInfo } from "@/lib/data";
import { ASSOCIATION_NAME, ASSOCIATION_NAME_BN, siteOrigin } from "@/lib/seo";
import { listPublicEvents } from "@/lib/events/service";
import { getContactPhones } from "@/lib/contact-phones";
import { DEFAULT_CONTACT_PHONES } from "@/lib/contact-phones-shared";
import { KEY_PAGES } from "@/lib/key-pages";

/**
 * The site in Markdown, for AI agents and assistants: served as /llms.txt and as the
 * home page when a client asks for text/markdown (next.config.mjs rewrites "/" to
 * /index.md). Only public facts: what the association is, how to reach it, its main
 * pages and the upcoming events. Nothing about individual members.
 */

/** One line per event: date, title, place and link. */
async function upcomingEventLines(origin: string): Promise<string[]> {
  const today = new Date().toISOString().slice(0, 10);
  const events = await listPublicEvents().catch(() => []);
  return events
    .filter((e) => e.date >= today)
    .slice(0, 10)
    .map((e) => `- ${e.date}: [${e.title}](${origin}/events/${e.slug}) at ${[e.venue, e.locationCity].filter(Boolean).join(", ")}`);
}

export async function siteMarkdown(): Promise<string> {
  const origin = siteOrigin();
  const phones = await getContactPhones().catch(() => DEFAULT_CONTACT_PHONES);
  const events = await upcomingEventLines(origin);

  return [
    `# ${ASSOCIATION_NAME} (${ASSOCIATION_NAME_BN})`,
    "",
    `> The alumni association of ${schoolInfo.name} (${schoolInfo.bengaliName}), ${schoolInfo.location}. Founded in 2015, it connects former students, holds reunions and supports the school and its students.`,
    "",
    "## Contact",
    "",
    `- Email: ${schoolInfo.associationEmail}`,
    ...phones.map((p) => `- Phone${p.name ? ` (${p.name})` : ""}: ${p.number}`),
    `- Address: ${schoolInfo.location}`,
    `- School phone: ${schoolInfo.phone}`,
    `- School website: ${schoolInfo.website}`,
    `- Facebook group: ${schoolInfo.facebookGroup}`,
    "",
    "## Upcoming events",
    "",
    ...(events.length ? events : ["- None announced yet. See " + `${origin}/events`]),
    "",
    "## Main pages",
    "",
    ...KEY_PAGES.map((p) => `- [${p.title}](${origin}${p.path}): ${p.about}`),
    "",
    "## Notes",
    "",
    "- Member profiles, the feed, messages and the dashboard need a signed-in member account.",
    "- Payments are made by bKash, Nagad, Bangla QR, bank transfer or cash, and confirmed by the treasurer.",
    `- Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}

export function markdownResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      Vary: "Accept",
    },
  });
}
