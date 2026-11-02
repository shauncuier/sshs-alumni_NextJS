/**
 * Pages Microsoft Clarity must not record (components/shared/ClarityAnalytics.tsx):
 * the admin panel and the pages that show a member's own private details. Clarity masks
 * what people type, but not text already on the page, such as phone numbers and payments.
 */
const PRIVATE_PREFIXES = ["/admin", "/gate", "/print", "/slip", "/verify", "/messages", "/profile", "/settings", "/dashboard", "/card", "/notifications"];

export function isPrivatePath(path: string): boolean {
  return PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
