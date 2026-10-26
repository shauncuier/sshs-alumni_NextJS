import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { checkDocument, DOCUMENT_MAX_BYTES, saveDocument } from "@/lib/media/documents";
import { readLimitedFormData, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";
import { can } from "@/lib/permissions";

// POST /api/admin/documents — upload a public PDF (constitution or notice attachment; form field "file").
export async function POST(req: Request) {
  const me = await getSessionUser();
  try {
    requireSameOrigin(req);
    if (!me || !(["committee", "notices"] as const).some((area) => can(me.role, area))) throw new AppError("FORBIDDEN", 403, "You cannot upload documents.");
    requireRateLimit(req, "admin-document-upload", { limit: 60, windowMs: 60 * 60_000 });
    const form = await readLimitedFormData(req, DOCUMENT_MAX_BYTES + 64 * 1024);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new AppError("INVALID_DOCUMENT", 400, "Please choose a PDF file.");
    const saved = await saveDocument(checkDocument(Buffer.from(await file.arrayBuffer())));
    await logActivity({ category: "CONTENT", action: "document.uploaded", summary: `Uploaded a PDF (${Math.ceil(file.size / 1024)} KB)`, actor: me, targetType: "Document", targetId: saved.id, req });
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/documents");
  }
}
