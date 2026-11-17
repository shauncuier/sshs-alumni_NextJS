import { schoolInfo } from "@/lib/data";
import { siteOrigin } from "@/lib/seo";

/** RFC 9116 asks for an "Expires" less than a year ahead. */
export const SECURITY_TXT_VALID_DAYS = 180;

/**
 * The body of /.well-known/security.txt (RFC 9116, https://www.rfc-editor.org/rfc/rfc9116):
 * where to report a security problem. Expires runs SECURITY_TXT_VALID_DAYS from the given day.
 */
export function securityTxt(now = new Date()): string {
  const expires = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + SECURITY_TXT_VALID_DAYS));
  return [
    `Contact: mailto:${schoolInfo.associationEmail}`,
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: en, bn",
    `Canonical: ${siteOrigin()}/.well-known/security.txt`,
    "Policy: https://github.com/shauncuier/sshs-alumni_NextJS#security",
    "",
  ].join("\n");
}
