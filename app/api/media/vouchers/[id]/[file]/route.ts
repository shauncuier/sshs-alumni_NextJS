import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { voucherFilePath } from "@/lib/media/vouchers";
import { can } from "@/lib/permissions";
import { getSessionUser } from "@/lib/session-user";

type Params = { params: Promise<{ id: string; file: string }> };

const TYPES: Record<string, { contentType: string; csp: string }> = {
  // Only this site may frame it (preview in the accounts); other sites may not.
  "voucher.pdf": { contentType: "application/pdf", csp: "frame-ancestors 'self'" },
  "voucher.jpg": { contentType: "image/jpeg", csp: "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" },
};

// Bills and receipts attached to vouchers: only for people who use the accounts.
export async function GET(_req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Sign in to view this file." }, { status: 401 });
  if (!can(me.role, "accounts")) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id, file } = await params;
  const type = TYPES[file];
  const filePath = type ? voucherFilePath(id, file) : null;
  if (!type || !filePath) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    return new NextResponse(new Uint8Array(await fs.readFile(filePath)), {
      headers: {
        "Content-Type": type.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="voucher-${id}${file.slice(7)}"`,
        "Content-Security-Policy": type.csp,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
