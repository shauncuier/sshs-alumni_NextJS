import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { contentImagePath } from "@/lib/media/content-images";

type Params = { params: Promise<{ id: string; file: string }> };

// Public images for news, gallery and stories. The id is random, so files cannot
// be listed or guessed; only the two generated WebP files are served.
export async function GET(_req: Request, { params }: Params) {
  const { id, file } = await params;
  const filePath = contentImagePath(id, file);
  if (!filePath) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    return new NextResponse(new Uint8Array(await fs.readFile(filePath)), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
