import { AppError } from "@/lib/app-error";

/**
 * Cloudflare Turnstile: a bot check on the public forms. The browser gets a token
 * from the widget (components/shared/Turnstile.tsx) and sends it as `turnstileToken`;
 * the handler redeems it here with Cloudflare before doing anything else.
 *
 * Off until TURNSTILE_SECRET is set (hPanel env), so a deploy without it changes nothing.
 * TURNSTILE_SITE_KEY: the public widget key (defaults to the site's widget).
 * TURNSTILE_HOSTNAMES: comma-separated pages the token may come from (defaults to the
 * site address in NEXT_PUBLIC_APP_URL, with and without www).
 */

export type TurnstileAction = "login" | "sms_code" | "email_code" | "register" | "contact" | "magazine" | "password_reset";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const DEFAULT_SITE_KEY = "0x4AAAAAAGCTTELzTXn4bBMG";
const MAX_TOKEN_LENGTH = 2048;

export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET?.trim());
}

/** The public key the widget needs, or null while the check is off. */
export function turnstileSiteKey(): string | null {
  if (!turnstileEnabled()) return null;
  return process.env.TURNSTILE_SITE_KEY?.trim() || DEFAULT_SITE_KEY;
}

/** "https://www.example.org/x", "example.org:443" → "www.example.org", "example.org". */
function hostOf(entry: string): string {
  const raw = entry.trim().toLowerCase();
  if (!raw) return "";
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).hostname;
  } catch {
    return "";
  }
}

function expectedHostnames(): Set<string> {
  const listed = (process.env.TURNSTILE_HOSTNAMES ?? "").split(",").map(hostOf).filter(Boolean);
  const hosts = listed.length ? listed : [hostOf(process.env.NEXT_PUBLIC_APP_URL ?? "")].filter(Boolean);
  // A site and its www. twin are one site: either may be listed, both are accepted.
  const out = new Set<string>();
  for (const host of hosts) {
    const bare = host.replace(/^www\./, "");
    out.add(host);
    if (bare.includes(".") && !/^\d+(\.\d+){3}$/.test(bare) && bare !== "localhost") {
      out.add(bare);
      out.add(`www.${bare}`);
    }
  }
  return out;
}

const failed = () => new AppError("TURNSTILE_FAILED", 403, "The robot check failed or expired. Please try again.");

/**
 * Throws TURNSTILE_FAILED (403) unless Cloudflare confirms the token: success, the
 * expected action, and one of our own pages. A token works once. If Cloudflare cannot
 * be reached the request is refused too (fail closed).
 */
export async function requireTurnstile(token: unknown, action: TurnstileAction, remoteIp?: string | null): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET?.trim();
  if (!secret) return;
  const hostnames = expectedHostnames();
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH || hostnames.size === 0) {
    throw failed();
  }

  let result: { success?: boolean; action?: string; hostname?: string; "error-codes"?: string[]; metadata?: { result_with_testing_key?: boolean } };
  try {
    const params = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== "unknown") params.set("remoteip", remoteIp);
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`siteverify ${res.status}`);
    result = await res.json();
  } catch (err) {
    console.error("[turnstile] siteverify unreachable:", err instanceof Error ? err.message : err);
    throw failed();
  }

  // Cloudflare's test keys report no action; accept that only outside production.
  const testKey = result.metadata?.result_with_testing_key === true && process.env.NODE_ENV !== "production";
  const actionOk = result.action === action || (testKey && !result.action);
  if (!result.success || !actionOk || !hostnames.has(String(result.hostname ?? "").toLowerCase())) {
    console.warn("[turnstile] rejected", {
      action,
      got: result.action,
      success: result.success,
      hostname: result.hostname,
      allowed: [...hostnames],
      errors: result["error-codes"],
    });
    throw failed();
  }
}
