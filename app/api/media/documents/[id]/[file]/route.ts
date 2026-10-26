import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { documentPath } from "@/lib/media/documents";

type Params = { params: Promise<{ id: string; file: string }> };

// Public PDFs (constitution, notice attachments). The id is random, so files cannot
// be listed or guessed; only the stored document.pdf is served.
export async function GET(_req: Request, { params }: Params) {
  const { id, file } = await params;
  const filePath = documentPath(id, file);
  if (!filePath) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    return new NextResponse(new Uint8Array(await fs.readFile(filePath)), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
