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
import { openJson, sealJson } from "@/lib/sealed-token";

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

// Unchanged purpose string: cards issued before this refactor stay valid.
const CARD_TOKEN_PURPOSE = "ssghs-alumni-card-token-v2";
const SCHOOL_EIIN = "105070";

/**
 * The member's SSGHS Alumni Identification Number.
 * Format: SSGHS-ALM-{BATCH}-{6 HEX}. The suffix is derived from the account id,
 * so a member keeps the same number every time their card is issued.
 */
export function generateAlumniId(batch: number | string, memberId: string): string {
  const cleanBatch = String(batch).slice(-4);
  const suffix = crypto.createHash("sha256").update(memberId).digest("hex").slice(0, 6).toUpperCase();
  return `SSGHS-ALM-${cleanBatch}-${suffix}`;
}

/** Encrypted, tamper-proof gate-verification token for a card payload. */
export function createCardToken(payload: Omit<CardPayload, "eiin">): string {
  return sealJson(CARD_TOKEN_PURPOSE, { ...payload, eiin: SCHOOL_EIIN } satisfies CardPayload);
}

/** Decrypt and verify a gate-verification token. */
export function verifyCardToken(token: string): { valid: boolean; payload?: CardPayload; error?: string } {
  // Earlier passes were readable "payload.signature" tokens. The card page issues a
  // fresh QR on every visit, so point the holder there rather than calling it forged.
  if (token.includes(".")) {
    return {
      valid: false,
      error: "This pass uses an outdated QR format. Ask the member to reopen their digital card for a new QR code.",
    };
  }
  const opened = openJson<CardPayload>(CARD_TOKEN_PURPOSE, token);
  if (!opened.ok) {
    return {
      valid: false,
      error: opened.reason === "malformed" ? "Invalid token structure" : "Cryptographic signature mismatch — pass may be forged",
    };
  }
  if (opened.value.expiresAt && Date.now() > opened.value.expiresAt) {
    return { valid: false, payload: opened.value, error: "Alumni pass has expired" };
  }
  return { valid: true, payload: opened.value };
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
