import { markdownResponse, siteMarkdown } from "@/lib/agent-summary";

/** /llms.txt: the site summarised for AI agents (https://llmstxt.org). */
export const dynamic = "force-dynamic";

export async function GET() {
  return markdownResponse(await siteMarkdown());
}
