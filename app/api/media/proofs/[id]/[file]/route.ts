import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { proofFilePath } from "@/lib/media/proofs";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

type Params = { params: Promise<{ id: string; file: string }> };

const notFound = () => NextResponse.json({ error: "Not found." }, { status: 404 });

const TYPES = new Map<string, { contentType: string; ext: string; csp: string }>([
  // No sandbox/default-src for PDFs: Chrome and Edge's built-in viewer shows a blocked
  // page under them. The PDF is never rendered by the app itself, and it may not be framed.
  ["document.pdf", { contentType: "application/pdf", ext: "pdf", csp: "frame-ancestors 'none'" }],
  [
    "document.jpg",
    { contentType: "image/jpeg", ext: "jpg", csp: "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" },
  ],
]);

/**
 * A new member's proof-of-study document. Private: administrators only, never
 * cached, and deleted once the membership is decided (then this answers 404).
 */
export async function GET(_req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Sign in to view this document." }, { status: 401 });
  if (!isAdminRole(me.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id, file } = await params;
  const type = TYPES.get(file);
  const path = type ? proofFilePath(id, file) : null;
  if (!type || !path) return notFound();

  let data: Buffer;
  try {
    data = await fs.readFile(path);
  } catch {
    return notFound();
  }
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": type.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="membership-proof-${id}.${type.ext}"`,
      "Content-Security-Policy": type.csp,
    },
  });
}
