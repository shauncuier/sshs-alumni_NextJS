/**
 * Member pictures, sized for slow mobile data. Safe to import in the browser.
 *
 * - Members without a photo get their initials as a tiny inline SVG: no request to
 *   another server (on a slow connection each new host costs a DNS lookup and a TLS
 *   handshake before the first byte).
 * - Uploaded photos (/api/media/avatars/<id>/avatar.webp, 400 px) are asked for at
 *   the size they are shown: the route serves 96 and 192 px copies.
 */

const AVATAR_PATH = /^\/api\/media\/avatars\/[a-f0-9]{32}\/avatar\.webp$/;

/** Initials ("Md Nahidul Islam" -> "MI") on the site's green, as a data: URL. */
export function initialsAvatar(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  const pick = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  const initials = pick.map((w) => Array.from(w)[0] ?? "").join("").toUpperCase() || "?";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#06281e"/>` +
    `<text x="32" y="33" dy=".35em" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="700" fill="#fcd34d">` +
    `${initials.replace(/[<&>"]/g, "")}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** A member picture for display at about `px` CSS pixels: a small copy when one exists, else initials. */
export function avatarAt(url: string | null | undefined, px: number, name = ""): string {
  if (!url) return initialsAvatar(name);
  if (!AVATAR_PATH.test(url)) return url;
  // Twice the display size for sharp phone screens; the full 400 px above 96 px.
  if (px <= 48) return `${url}?s=96`;
  if (px <= 96) return `${url}?s=192`;
  return url;
}
