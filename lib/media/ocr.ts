import { createWorker } from "tesseract.js";
import sharp from "sharp";

export const OCR_LIMITS = { maxBytes: 5 * 1024 * 1024, maxPixels: 20_000_000 } as const;
const OCR_FORMATS = new Set(["jpeg", "png", "webp"]);

export interface OcrResult {
  rawText: string;
  confidence: number;
  detectedTrxId: string | null;
  detectedBatch: number | null;
  detectedRoll: string | null;
  schoolDetected: boolean;
}

export async function validateOcrImage(imageBuffer: Buffer): Promise<void> {
  if (imageBuffer.length === 0 || imageBuffer.length > OCR_LIMITS.maxBytes) throw new Error("Invalid image size");
  const metadata = await sharp(imageBuffer, { limitInputPixels: OCR_LIMITS.maxPixels }).metadata();
  if (!metadata.format || !OCR_FORMATS.has(metadata.format) || !metadata.width || !metadata.height) {
    throw new Error("Unsupported image format");
  }
  if (metadata.width * metadata.height > OCR_LIMITS.maxPixels) throw new Error("Image dimensions are too large");
}

/**
 * Patterns commonly found on bKash, Nagad, Rocket, and Bangladeshi bank receipts:
 * - TrxID: BK94X7L2RM, Trx ID 9AB3XK1, Txn: 89012345
 * - Transaction ID: ...
 */
const TRX_PATTERNS = [
  /(?:TrxID|Trx\s*ID|TxnID|Txn\s*ID|Transaction\s*ID|Reference|Ref)[:\s#]*([A-Za-z0-9]{6,20})/i,
  /\b([0-9A-Z]{8,14})\b/g,
];

/**
 * Pre-processes an image with Sharp to optimize contrast and clarity for OCR,
 * then extracts text via Tesseract.js.
 */
export async function performOcr(imageBuffer: Buffer): Promise<OcrResult> {
  try {
    // 1. Optimize image for OCR using sharp:
    // Convert to grayscale, enhance contrast, resize if too small/large.
    const preprocessed = await sharp(imageBuffer, { limitInputPixels: OCR_LIMITS.maxPixels })
      .greyscale()
      .normalize()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();

    // 2. Initialize Tesseract worker
    const worker = await createWorker("eng");
    const result = await worker.recognize(preprocessed);
    await worker.terminate();

    const rawText = result.data.text || "";
    const confidence = Math.round(result.data.confidence || 0);

    // 3. Extract Transaction ID
    let detectedTrxId: string | null = null;
    const directMatch = rawText.match(TRX_PATTERNS[0]);
    if (directMatch && directMatch[1]) {
      detectedTrxId = directMatch[1].trim().toUpperCase();
    } else {
      // Look for 8-12 character alphanumeric string typical of bKash/Nagad
      const candidates = rawText.match(TRX_PATTERNS[1]);
      if (candidates) {
        // Exclude common words like "SUCCESS", "PAYMENT", "COMPLETED", "BANGLADESH"
        const ignored = new Set(["SUCCESS", "PAYMENT", "COMPLETED", "BANGLADESH", "TRANSACTION", "REFERENCE", "COMMERCE", "EDUCATION"]);
        const found = candidates.find((c) => c.length >= 8 && c.length <= 12 && !ignored.has(c.toUpperCase()) && /[0-9]/.test(c) && /[A-Z]/i.test(c));
        if (found) detectedTrxId = found.trim().toUpperCase();
      }
    }

    // 4. Extract SSC Batch Year (1980 - 2030)
    let detectedBatch: number | null = null;
    const yearMatches = rawText.match(/\b(19[8-9][0-9]|20[0-2][0-9]|2030)\b/g);
    if (yearMatches && yearMatches.length > 0) {
      detectedBatch = Number(yearMatches[0]);
    }

    // 5. Extract Roll Number
    let detectedRoll: string | null = null;
    const rollMatch = rawText.match(/(?:Roll\s*(?:No|Number)?|রোল)[:\s#]*([0-9]{1,7})/i);
    if (rollMatch && rollMatch[1]) {
      detectedRoll = rollMatch[1].trim();
    }

    // 6. Detect School Name presence
    const schoolDetected =
      /sabuj|shikshayatan|ssghs|sshs|সবুজ|শিক্ষায়তন/i.test(rawText);

    return {
      rawText,
      confidence,
      detectedTrxId,
      detectedBatch,
      detectedRoll,
      schoolDetected,
    };
  } catch (err) {
    console.error("OCR extraction failed:", err);
    return {
      rawText: "",
      confidence: 0,
      detectedTrxId: null,
      detectedBatch: null,
      detectedRoll: null,
      schoolDetected: false,
    };
  }
}
