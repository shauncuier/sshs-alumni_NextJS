/**
 * SSGHS Alumni — Digital Smart ID Card & Gate Verification Utility
 * 
 * Provides:
 * 1. Cryptographic token signing & verification for Gate Check-in QR Codes
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

let devSigningKey: string | undefined;

/**
 * HMAC key for card tokens. Production requires NEXTAUTH_SECRET: a key published
 * in the source would let anyone forge valid passes. Development falls back to a
 * random per-process key, so issued cards stop verifying after a restart.
 */
function cardSigningKey(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET must be set to sign or verify alumni ID cards.");
  }
  devSigningKey ??= crypto.randomBytes(32).toString("hex");
  return devSigningKey;
}

function hmac(encodedPayload: string, key: string): string {
  return crypto.createHmac("sha256", key).update(encodedPayload).digest("base64url");
}
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
 * Sign an alumni card payload to create a secure gate-verification token
 */
export function signCardPayload(payload: Omit<CardPayload, "eiin">): string {
  const fullPayload: CardPayload = {
    ...payload,
    eiin: SCHOOL_EIIN,
  };

  const payloadString = JSON.stringify(fullPayload);
  const encodedPayload = Buffer.from(payloadString, "utf8").toString("base64url");

  return `${encodedPayload}.${hmac(encodedPayload, cardSigningKey())}`;
}

/**
 * Verify and decode an encrypted gate-verification token
 */
export function verifyCardToken(token: string): { valid: boolean; payload?: CardPayload; error?: string } {
  // Read the key outside the try: a missing secret is a server misconfiguration,
  // not a forged card, and must not be reported to gate staff as one.
  const key = cardSigningKey();
  try {
    const parts = token.split(".");
    if (parts.length !== 2) {
      return { valid: false, error: "Invalid token structure" };
    }

    const [encodedPayload, signature] = parts;
    // Constant-time comparison, so response timing reveals nothing about the signature.
    const expected = Buffer.from(hmac(encodedPayload, key));
    const received = Buffer.from(signature);
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
      return { valid: false, error: "Cryptographic signature mismatch — pass may be forged" };
    }

    const payloadJson = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload: CardPayload = JSON.parse(payloadJson);

    // Check expiration if set
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return { valid: false, payload, error: "Alumni pass has expired" };
    }

    return { valid: true, payload };
  } catch (err: unknown) {
    return { valid: false, error: (err as Error).message || "Failed to verify token" };
  }
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
