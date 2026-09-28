/**
 * SSGHS Alumni — Digital Smart ID Card & Gate Verification Utility
 * 
 * Provides:
 * 1. Encrypted, tamper-proof tokens for Gate Check-in QR Codes
 * 2. High-resolution QR code generator (Data URL & SVG)
 * 3. Apple Wallet (.pkpass) and Google Wallet pass structures
 */

import crypto from "crypto";
import QRCode from "qrcode";

export interface CardPayload {
  alumniId: string;
  userId?: string;
  fullName: string;
  sscBatch: number;
  profession?: string;
  bloodGroup?: string;
  membershipTier: "LIFETIME" | "ANNUAL" | "HONORARY" | "GENERAL";
  issuedAt: number;
  expiresAt?: number;
  eiin: string; // 105070
}

let devSecret: string | undefined;

/**
 * Secret for card tokens. Production requires NEXTAUTH_SECRET: a key published
 * in the source would let anyone forge or read passes. Development falls back to
 * a random per-process secret, so issued cards stop verifying after a restart.
 */
function cardSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET must be set to issue or verify alumni ID cards.");
  }
  devSecret ??= crypto.randomBytes(32).toString("hex");
  return devSecret;
}

// A dedicated AES-256 key, so card tokens never reuse the NextAuth secret directly.
function cardEncryptionKey(): Buffer {
  return Buffer.from(crypto.hkdfSync("sha256", cardSecret(), "", "ssghs-alumni-card-token-v2", 32));
}

const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const SCHOOL_EIIN = "105070";

/**
 * Generate a unique SSGHS Alumni Identification Number
 * Format: SSGHS-ALM-{BATCH}-{RANDOM_HEX}
 */
export function generateAlumniId(batch: number | string): string {
  const cleanBatch = String(batch).slice(-4);
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SSGHS-ALM-${cleanBatch}-${randomSuffix}`;
}

/**
 * Create a gate-verification token for a card payload.
 *
 * The payload is encrypted with AES-256-GCM, so the QR code and /verify URL reveal
 * nothing about the member; GCM's auth tag also makes the token tamper-proof.
 * Token = base64url(iv | authTag | ciphertext).
 */
export function createCardToken(payload: Omit<CardPayload, "eiin">): string {
  const fullPayload: CardPayload = { ...payload, eiin: SCHOOL_EIIN };
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", cardEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(fullPayload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

/**
 * Decrypt and verify a gate-verification token.
 */
export function verifyCardToken(token: string): { valid: boolean; payload?: CardPayload; error?: string } {
  // Derive the key outside the try: a missing secret is a server misconfiguration,
  // not a forged card, and must not be reported to gate staff as one.
  const key = cardEncryptionKey();

  // Earlier passes were readable "payload.signature" tokens. The card page issues a
  // fresh QR on every visit, so point the holder there rather than calling it forged.
  if (token.includes(".")) {
    return {
      valid: false,
      error: "This pass uses an outdated QR format. Ask the member to reopen their digital card for a new QR code.",
    };
  }

  const raw = Buffer.from(token, "base64url");
  if (raw.length <= IV_BYTES + AUTH_TAG_BYTES) {
    return { valid: false, error: "Invalid token structure" };
  }

  let payload: CardPayload;
  try {
    const iv = raw.subarray(0, IV_BYTES);
    const authTag = raw.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(raw.subarray(IV_BYTES + AUTH_TAG_BYTES)), decipher.final()]);
    payload = JSON.parse(plaintext.toString("utf8"));
  } catch {
    // GCM authentication failed: the token was altered or not issued by this server.
    return { valid: false, error: "Cryptographic signature mismatch — pass may be forged" };
  }

  if (payload.expiresAt && Date.now() > payload.expiresAt) {
    return { valid: false, payload, error: "Alumni pass has expired" };
  }

  return { valid: true, payload };
}

/**
 * Generate QR Code as Data URL (base64 PNG)
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "H",
    margin: 1,
    color: {
      dark: "#064e3b", // Forest green
      light: "#ffffff",
    },
    width: 320,
  });
}

/**
 * Generate QR Code as inline SVG string
 */
export async function generateQrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 1,
    color: {
      dark: "#064e3b",
      light: "#ffffff",
    },
  });
}

/**
 * Build Apple Wallet .pkpass JSON structure (passes/generic or storeCard)
 */
export function buildAppleWalletPassManifest(payload: CardPayload, qrData: string) {
  return {
    formatVersion: 1,
    passTypeIdentifier: "pass.bd.edu.sabujsghs.alumni",
    serialNumber: payload.alumniId,
    teamIdentifier: "BD_SSGHS_ASSOC",
    organizationName: "Sabuj Shikshayatan Govt High School Alumni",
    description: `SSGHS Alumni Identity Pass — ${payload.fullName}`,
    logoText: "SSGHS Alumni",
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: "rgb(6, 78, 59)", // #064e3b
    labelColor: "rgb(251, 191, 36)", // #fbbf24
    generic: {
      primaryFields: [
        {
          key: "member",
          label: "ALUMNUS",
          value: payload.fullName,
        },
      ],
      secondaryFields: [
        {
          key: "batch",
          label: "SSC BATCH",
          value: `Batch ${payload.sscBatch}`,
        },
        {
          key: "tier",
          label: "MEMBERSHIP",
          value: `${payload.membershipTier} MEMBER`,
        },
      ],
      auxiliaryFields: [
        {
          key: "eiin",
          label: "SCHOOL EIIN",
          value: payload.eiin,
        },
        {
          key: "blood",
          label: "BLOOD GROUP",
          value: payload.bloodGroup || "N/A",
        },
      ],
      backFields: [
        {
          key: "school",
          label: "Institution",
          value: "Sabuj Shikshayatan Government High School, Chattogram",
        },
        {
          key: "terms",
          label: "Gate Security Terms",
          value: "This digital credential is the official property of the SSGHS Alumni Association. Present at official reunions and campus gates for verification.",
        },
      ],
    },
    barcode: {
      message: qrData,
      format: "PKBarcodeFormatQR",
      messageEncoding: "iso-8859-1",
      altText: payload.alumniId,
    },
  };
}

/**
 * Build Google Wallet Save Pass link / JWT payload
 */
export function buildGoogleWalletPassPayload(payload: CardPayload, verifyUrl: string) {
  const classId = `3388000000022316401.ssghs_alumni_pass_class`;
  const objectId = `3388000000022316401.${payload.alumniId.replace(/[^a-zA-Z0-9_]/g, "_")}`;

  return {
    iss: "ssghs-alumni-service@developer.gserviceaccount.com",
    aud: "google",
    typ: "savetoandroidpay",
    iat: Math.floor(Date.now() / 1000),
    origins: ["https://sabujsghs.edu.bd"],
    payload: {
      genericObjects: [
        {
          id: objectId,
          classId: classId,
          logo: {
            sourceUri: {
              uri: "https://sabujsghs.edu.bd/images/school-logo.png",
            },
          },
          cardTitle: {
            defaultValue: {
              language: "en-US",
              value: "SSGHS Alumni Association",
            },
          },
          header: {
            defaultValue: {
              language: "en-US",
              value: payload.fullName,
            },
          },
          subheader: {
            defaultValue: {
              language: "en-US",
              value: `SSC Batch ${payload.sscBatch}`,
            },
          },
          barcode: {
            type: "QR_CODE",
            value: verifyUrl,
            alternateText: payload.alumniId,
          },
          hexBackgroundColor: "#064e3b",
        },
      ],
    },
  };
}
