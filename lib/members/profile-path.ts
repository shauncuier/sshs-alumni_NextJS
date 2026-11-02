/** The address of a member's public profile page. Safe to import in the browser. */
export function alumniPath(p: { id: string; slug?: string | null }): string {
  return `/alumni/${encodeURIComponent(p.slug || p.id)}`;
}
