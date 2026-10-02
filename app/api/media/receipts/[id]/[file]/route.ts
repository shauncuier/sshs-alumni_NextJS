import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { receiptFilePath } from "@/lib/media/receipts";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

type Params = { params: Promise<{ id: string; file: string }> };

const notFound = () => NextResponse.json({ error: "Not found." }, { status: 404 });

const TYPES = new Map<string, { contentType: string; ext: string; csp: string }>([
  ["receipt.pdf", { contentType: "application/pdf", ext: "pdf", csp: "frame-ancestors 'none'" }],
  [
    "receipt.jpg",
    { contentType: "image/jpeg", ext: "jpg", csp: "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" },
  ],
]);

export async function GET(_req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Sign in to view this receipt." }, { status: 401 });
  if (!isAdminRole(me.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id, file } = await params;
  const type = TYPES.get(file);
  const path = type ? receiptFilePath(id, file) : null;
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
      "Content-Disposition": `inline; filename="payment-receipt-${id}.${type.ext}"`,
      "Content-Security-Policy": type.csp,
    },
  });
}
