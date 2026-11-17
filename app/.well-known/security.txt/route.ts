import { securityTxt } from "@/lib/security-txt";

/**
 * security.txt: where to report a security problem (lib/security-txt.ts). Its "Expires"
 * must stay less than a year ahead, so the file is rebuilt daily and stays valid as long
 * as the site runs. /security.txt redirects here (next.config.mjs).
 */
export const revalidate = 86400;

export function GET() {
  return new Response(securityTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
