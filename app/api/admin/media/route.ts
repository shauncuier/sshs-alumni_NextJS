import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { CONTENT_IMAGE_LIMITS, processContentImage, saveContentImage } from "@/lib/media/content-images";
import { readLimitedFormData, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

// POST /api/admin/media — upload an image for news, gallery or stories (form field "image").
export async function POST(req: Request) {
  const me = await getSessionUser();
  try {
    requireSameOrigin(req);
    if (!me || !isAdminRole(me.role)) throw new AppError("FORBIDDEN", 403, "Only administrators can upload images.");
    requireRateLimit(req, "admin-image-upload", { limit: 200, windowMs: 60 * 60_000 });
    const form = await readLimitedFormData(req, CONTENT_IMAGE_LIMITS.maxBytes + 64 * 1024);
    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0) throw new AppError("INVALID_IMAGE", 400, "Please choose an image.");
    const processed = await processContentImage(Buffer.from(await file.arrayBuffer()));
    const saved = await saveContentImage(processed);
    await logActivity({ category: "CONTENT", action: "image.uploaded", summary: `Uploaded an image (${processed.width}×${processed.height})`, actor: me, targetType: "ContentImage", targetId: saved.id, req });
    return NextResponse.json({ ...saved, width: processed.width, height: processed.height }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/media");
  }
}
