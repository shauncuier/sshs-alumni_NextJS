import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AppError } from "@/lib/app-error";
import { uploadsRoot } from "./avatars";

export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_INPUT_PIXELS = 100_000_000;
const SHARP_INPUT = { limitInputPixels: MAX_INPUT_PIXELS };
const MAX_SIDE = 2400;
const ALLOWED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp"]);
const ID_PATTERN = /^[a-f0-9]{32}$/;
const PDF_MAGIC = Buffer.from("%PDF-", "latin1");

export interface ProcessedReceipt {
  data: Buffer;
  mime: "image/jpeg" | "application/pdf";
  ext: "jpg" | "pdf";
}

function receiptsRoot(): string {
  return path.join(uploadsRoot(), "receipts");
}

export async function processReceipt(input: Buffer): Promise<ProcessedReceipt> {
  if (input.length > RECEIPT_MAX_BYTES) {
    throw new AppError("INVALID_RECEIPT", 400, "The receipt must be 10 MB or smaller.");
  }
  if (input.length === 0) {
    throw new AppError("INVALID_RECEIPT", 400, "Please upload a valid receipt image or PDF.");
  }
  if (input.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    return { data: input, mime: "application/pdf", ext: "pdf" };
  }

  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input, SHARP_INPUT).metadata();
  } catch {
    throw new AppError("INVALID_RECEIPT", 400, "Could not process image format.");
  }

  if (!meta.format || !ALLOWED_IMAGE_FORMATS.has(meta.format) || !meta.width || !meta.height) {
    throw new AppError("INVALID_RECEIPT", 400, "Please upload a JPEG, PNG, WebP or PDF receipt.");
  }

  try {
    const data = await sharp(input, SHARP_INPUT)
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
    return { data, mime: "image/jpeg", ext: "jpg" };
  } catch {
    throw new AppError("INVALID_RECEIPT", 400, "Failed to optimize receipt image.");
  }
}

export async function saveReceipt(
  receipt: ProcessedReceipt
): Promise<{ id: string; fileUrl: string }> {
  const id = crypto.randomBytes(16).toString("hex");
  const dir = path.join(receiptsRoot(), id);
  const file = `receipt.${receipt.ext}`;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, file), receipt.data);
  return { id, fileUrl: `/api/media/receipts/${id}/${file}` };
}

export function receiptFilePath(id: string, file: string): string | null {
  if (!ID_PATTERN.test(id)) return null;
  return path.join(receiptsRoot(), id, file);
}
