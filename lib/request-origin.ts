/**
 * The public origin (scheme://host) a request was made to, for links that leave
 * the server such as QR codes. Honours a reverse proxy's X-Forwarded-* headers,
 * and otherwise uses the request's own scheme instead of guessing from the host
 * name (guessing turned http://127.0.0.1 or a LAN address into a dead https link).
 */
export function publicOrigin(req: Request): string {
  const url = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || url.protocol.replace(/:$/, "");
  const host = forwardedHost || req.headers.get("host") || url.host;
  return `${protocol}://${host}`;
}
