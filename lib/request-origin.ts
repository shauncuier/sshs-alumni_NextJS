/**
 * The public origin (scheme://host) a request was made to, for links that leave
 * the server such as QR codes. Honours a reverse proxy's X-Forwarded-* headers,
 * and otherwise uses the request's own scheme instead of guessing from the host
 * name (guessing turned http://127.0.0.1 or a LAN address into a dead https link).
 */
export function publicOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return new URL(configured).origin;
  if (process.env.NODE_ENV !== "production") return new URL(req.url).origin;
  throw new Error("NEXT_PUBLIC_APP_URL must be set in production.");
}
