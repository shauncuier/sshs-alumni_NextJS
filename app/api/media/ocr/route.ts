import { NextResponse } from "next/server";
import { AppError } from "@/lib/app-error";
import { OCR_LIMITS, performOcr, validateOcrImage } from "@/lib/media/ocr";
import { readLimitedFormData, requireRateLimit } from "@/lib/request-security";

export async function POST(req: Request) {
  try {
    requireRateLimit(req, "ocr", { limit: 3, windowMs: 10 * 60_000 });
    const formData = await readLimitedFormData(req, OCR_LIMITS.maxBytes + 64 * 1024);
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No image file uploaded" }, { status: 400 });
    }

    if (file.size > OCR_LIMITS.maxBytes) {
      return NextResponse.json({ error: "File exceeds 5 MB limit" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await validateOcrImage(buffer);
    const ocrResult = await performOcr(buffer);

    return NextResponse.json({
      success: true,
      ...ocrResult,
    });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    console.error("Error in OCR route:", err);
    return NextResponse.json({ error: "OCR processing failed" }, { status: 500 });
  }
}
