import { NextResponse } from "next/server";
import { performOcr } from "@/lib/media/ocr";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No image file uploaded" }, { status: 400 });
    }

    // Limit file size to 10 MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ocrResult = await performOcr(buffer);

    return NextResponse.json({
      success: true,
      ...ocrResult,
    });
  } catch (err) {
    console.error("Error in OCR route:", err);
    return NextResponse.json({ error: "OCR processing failed" }, { status: 500 });
  }
}
