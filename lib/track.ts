/**
 * Reports something a visitor did (joined, signed in, registered for an event, donated,
 * sent a form) to the site's analytics.
 *
 * Cloudflare Zaraz adds `window.zaraz` to pages served through Cloudflare and forwards
 * each event from Cloudflare's servers to Google Analytics 4, so no analytics script
 * runs in the browser. Where Zaraz is absent (development, tests, a visitor blocking
 * it) this does nothing.
 *
 * Never pass names, phone numbers, emails or free text: only what kind of thing happened.
 */
type Zaraz = { track?: (name: string, properties?: Record<string, string | number | boolean>) => unknown };

export function track(name: string, properties?: Record<string, string | number | boolean>): void {
  if (typeof window === "undefined") return;
  try {
    void (window as unknown as { zaraz?: Zaraz }).zaraz?.track?.(name, properties);
  } catch {
    // Analytics must never break the page.
  }
}
