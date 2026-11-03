import { markdownResponse, siteMarkdown } from "@/lib/agent-summary";

/**
 * The home page in Markdown. Clients that send "Accept: text/markdown" for "/" are
 * rewritten here (next.config.mjs); browsers keep getting the HTML page.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return markdownResponse(await siteMarkdown());
}
