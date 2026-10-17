import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimits = new Map<string, RateLimitEntry>();

export function clientAddress(req: Request): string {
  return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function consumeRateLimit(key: string, { limit, windowMs }: RateLimitOptions): boolean {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return true;
  const now = Date.now();
  if (rateLimits.size > 10_000) {
    for (const [storedKey, entry] of rateLimits) {
      if (entry.resetAt <= now) rateLimits.delete(storedKey);
    }
  }
  const current = rateLimits.get(key);
  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

/** Milliseconds until `key` may be used again (0 when it may now). */
export function rateLimitWait(key: string, now = Date.now()): number {
  const entry = rateLimits.get(key);
  return entry ? Math.max(0, entry.resetAt - now) : 0;
}

export function resetRateLimit(key: string): void {
  rateLimits.delete(key);
}

export function requireRateLimit(req: Request, scope: string, options: RateLimitOptions): void {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
  if (!consumeRateLimit(`${scope}:${clientAddress(req)}`, options)) {
    // Not awaited: this check is synchronous, and logging never throws.
    void logActivity({
      category: "SECURITY",
      action: "rate_limited",
      status: "FAILURE",
      summary: `Rate limit hit on ${scope} (${options.limit} per ${Math.round(options.windowMs / 60_000)} min)`,
      metadata: { scope, path: new URL(req.url).pathname },
      req,
    });
    const minutes = Math.max(1, Math.ceil(rateLimitWait(`${scope}:${clientAddress(req)}`) / 60_000));
    throw new AppError("RATE_LIMITED", 429, `Too many attempts from your network. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
  }
}

/**
 * Refuses a write request sent by another site (cross-site request forgery). Browsers
 * send an Origin header on every cross-site POST/PUT/PATCH/DELETE; a request without
 * one is not from another site's page (e.g. curl or a same-origin form in older
 * browsers) and is allowed. Every write route calls this, except payment-gateway
 * callbacks (tests/write-routes.test.ts keeps it that way).
 */
export function requireSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) {
    if (req.headers.get("sec-fetch-site") === "cross-site") throw new AppError("CSRF_VIOLATION", 403, "Cross-origin request rejected.");
    return;
  }

  const host = req.headers.get("host");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const expectedHost = forwardedHost || host;

  try {
    const originUrl = new URL(origin);
    if (expectedHost && originUrl.host !== expectedHost) {
      if (process.env.NEXT_PUBLIC_APP_URL) {
        const canonical = new URL(process.env.NEXT_PUBLIC_APP_URL);
        if (originUrl.host === canonical.host) return;
      }
      throw new AppError("CSRF_VIOLATION", 403, "Cross-origin request rejected.");
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("CSRF_VIOLATION", 403, "Invalid origin.");
  }
}

/** Default cap on JSON request bodies; long admin content (news, stories, events, SMS) passes LARGE_JSON_BYTES. */
export const JSON_BODY_BYTES = 64 * 1024;
export const LARGE_JSON_BYTES = 512 * 1024;

const tooLarge = () => new AppError("BODY_TOO_LARGE", 413, "The request is too large.");

/** The request body as text, refusing (413) once it passes maxBytes without holding more. */
async function readLimitedText(req: Request, maxBytes: number): Promise<string> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw tooLarge();
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let seen = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    seen += value.byteLength;
    if (seen > maxBytes) {
      await reader.cancel().catch(() => {});
      throw tooLarge();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// Every JSON route expects an object body. A malformed or non-object body is the
// client's mistake, so it must surface as a 400, not crash a destructure into a 500;
// a body over the cap is a 413.
export async function readJsonBody(req: Request, maxBytes = JSON_BODY_BYTES): ReturnType<Request["json"]> {
  let body: unknown;
  let text: string;
  try {
    text = await readLimitedText(req, maxBytes);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("INVALID_REQUEST", 400, "Invalid request.");
  }
  try {
    body = JSON.parse(text);
  } catch {
    throw new AppError("INVALID_REQUEST", 400, "Invalid request.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new AppError("INVALID_REQUEST", 400, "Invalid request.");
  }
  return body;
}

export async function readLimitedFormData(req: Request, maxBytes: number): Promise<FormData> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new AppError("UPLOAD_TOO_LARGE", 413, "The uploaded file is too large.");
  }
  if (!req.body) throw new AppError("INVALID_REQUEST", 400, "Invalid request.");

  let seen = 0;
  const limited = req.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > maxBytes) controller.error(new AppError("UPLOAD_TOO_LARGE", 413, "The uploaded file is too large."));
        else controller.enqueue(chunk);
      },
    })
  );

  try {
    return await new Response(limited, { headers: req.headers }).formData();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("INVALID_REQUEST", 400, "Invalid request.");
  }
}
