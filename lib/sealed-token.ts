import crypto from "crypto";

const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

let devSecret: string | undefined;

/**
 * Production requires NEXTAUTH_SECRET: a key published in the source would let anyone
 * forge or read passes and tickets. Development falls back to a random per-process
 * secret, so issued tokens stop verifying after a restart.
 */
function secret(): string {
  const value = process.env.NEXTAUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET must be set to issue or verify alumni cards and event tickets.");
  }
  devSecret ??= crypto.randomBytes(32).toString("hex");
  return devSecret;
}

// Each purpose gets its own AES-256 key, so a card token can never be read as a ticket.
function keyFor(purpose: string): Buffer {
  return Buffer.from(crypto.hkdfSync("sha256", secret(), "", purpose, 32));
}

/** Encrypts `value` as JSON with AES-256-GCM. Token = base64url(iv | authTag | ciphertext). */
export function sealJson(purpose: string, value: unknown): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFor(purpose), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

export type OpenResult<T> = { ok: true; value: T } | { ok: false; reason: "malformed" | "forged" };

export function openJson<T>(purpose: string, token: string): OpenResult<T> {
  // Derive the key outside the try: a missing secret is a server misconfiguration
  // and must surface as an error, not as a "forged" token.
  const key = keyFor(purpose);
  const raw = Buffer.from(token, "base64url");
  if (raw.length <= IV_BYTES + AUTH_TAG_BYTES) return { ok: false, reason: "malformed" };
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, raw.subarray(0, IV_BYTES));
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES));
    const plaintext = Buffer.concat([decipher.update(raw.subarray(IV_BYTES + AUTH_TAG_BYTES)), decipher.final()]);
    return { ok: true, value: JSON.parse(plaintext.toString("utf8")) as T };
  } catch {
    return { ok: false, reason: "forged" };
  }
}
