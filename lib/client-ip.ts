/**
 * The visitor's IP address, for rate limits, the activity log and the robot check.
 *
 * The host's proxy reports the machine that connected to it in x-real-ip (or, without
 * that, x-forwarded-for). When the domain is proxied through Cloudflare that machine is
 * a Cloudflare server shared by many visitors, and Cloudflare names the real visitor in
 * CF-Connecting-IP. That header is believed only when the connection really came from
 * Cloudflare's network; anyone reaching the host directly could otherwise send a made-up
 * one to dodge the rate limits.
 */

// Cloudflare's published ranges: https://www.cloudflare.com/ips/
const CLOUDFLARE_V4 = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
];
const CLOUDFLARE_V6 = ["2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32", "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32"];

/** An IPv4 address as a number, or null when it is not one. */
function v4Number(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return null;
    n = n * 256 + Number(part);
  }
  return n;
}

/** The first 32 bits of an IPv6 address as a number, or null when it cannot be read. */
function v6Head(ip: string): number | null {
  const [a, b] = ip.split(":");
  if (!/^[0-9a-f]{1,4}$/.test(a ?? "") || !/^[0-9a-f]{0,4}$/.test(b ?? "")) return null;
  return parseInt(a, 16) * 65536 + parseInt(b || "0", 16);
}

type Range = { base: number; bits: number };
const range = (cidr: string, toNumber: (ip: string) => number | null): Range => {
  const [ip, bits] = cidr.split("/");
  return { base: toNumber(ip) ?? 0, bits: Number(bits) };
};
const V4_RANGES = CLOUDFLARE_V4.map((cidr) => range(cidr, v4Number));
const V6_RANGES = CLOUDFLARE_V6.map((cidr) => range(cidr, v6Head));

// Both kinds are compared on a 32-bit number: the whole IPv4 address, or the head of an IPv6 one.
const inRange = (value: number, { base, bits }: Range) => Math.floor(value / 2 ** (32 - bits)) === Math.floor(base / 2 ** (32 - bits));

/** Whether an address belongs to Cloudflare's network. */
export function isCloudflareAddress(address: string): boolean {
  const ip = address.trim().toLowerCase().replace(/^::ffff:/, "");
  const v4 = v4Number(ip);
  if (v4 !== null) return V4_RANGES.some((r) => inRange(v4, r));
  const v6 = v6Head(ip);
  return v6 !== null && V6_RANGES.some((r) => inRange(v6, r));
}

/** The visitor's IP address from a request's headers; `header` returns one header by its lower-case name. */
export function clientIp(header: (name: string) => string | null | undefined): string | null {
  const realIp = header("x-real-ip")?.trim();
  const forwarded = (header("x-forwarded-for") ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  // The machine that connected to the host: x-real-ip, else the last hop in x-forwarded-for.
  const connected = realIp || forwarded[forwarded.length - 1];
  const visitor = header("cf-connecting-ip")?.trim();
  if (visitor && connected && isCloudflareAddress(connected)) return visitor;
  return realIp || forwarded[0] || null;
}
