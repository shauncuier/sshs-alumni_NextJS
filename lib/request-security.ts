import { AppError } from "@/lib/app-error";

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

export function resetRateLimit(key: string): void {
  rateLimits.delete(key);
}

export function requireRateLimit(req: Request, scope: string, options: RateLimitOptions): void {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
  if (!consumeRateLimit(`${scope}:${clientAddress(req)}`, options)) {
    throw new AppError("RATE_LIMITED", 429, "Too many requests. Please try again later.");
  }
}

export function requireSameOrigin(req: Request): void {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
  const origin = req.headers.get("origin");
  if (!origin) return;

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
