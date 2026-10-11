import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { createAlbum, GALLERY_CATEGORIES, listAlbumsForAdmin } from "@/lib/gallery";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireGalleryAdmin } from "@/lib/admin/gallery-auth";

// GET /api/admin/gallery — every album with its photos, unpublished first.
export async function GET() {
  try {
    await requireGalleryAdmin();
    return NextResponse.json({ albums: await listAlbumsForAdmin(), categories: GALLERY_CATEGORIES });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/gallery");
  }
}

// POST /api/admin/gallery — create an (unpublished) album.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireGalleryAdmin();
    const album = await createAlbum(await readJsonBody(req), me.email);
    await logActivity({ category: "CONTENT", action: "album.created", summary: `Created gallery album "${album.title}"`, actor: me, targetType: "GalleryAlbum", targetId: album.id, metadata: { category: album.category }, req });
    return NextResponse.json({ album }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/gallery");
  }
}
