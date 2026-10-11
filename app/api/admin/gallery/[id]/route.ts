import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { deleteAlbum, updateAlbum } from "@/lib/gallery";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireGalleryAdmin } from "@/lib/admin/gallery-auth";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/gallery/[id] — rename, describe, set the cover, publish or unpublish.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireGalleryAdmin();
    const body = await readJsonBody(req);
    const { album, published } = await updateAlbum((await params).id, body, me.email);
    const action = published ? "album.published" : body.isPublished === false ? "album.unpublished" : "album.updated";
    await logActivity({ category: "CONTENT", action, summary: `${action === "album.published" ? "Published" : action === "album.unpublished" ? "Unpublished" : "Edited"} gallery album "${album.title}"`, actor: me, targetType: "GalleryAlbum", targetId: album.id, metadata: { fields: Object.keys(body), photos: album.photosCount }, req });
    return NextResponse.json({ album });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/gallery/[id]");
  }
}

// DELETE /api/admin/gallery/[id] — delete the album and every photo file in it.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireGalleryAdmin();
    const album = await deleteAlbum((await params).id);
    await logActivity({ category: "CONTENT", action: "album.deleted", summary: `Deleted gallery album "${album.title}" (${album.photosCount} photos)`, actor: me, targetType: "GalleryAlbum", targetId: album.id, req });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/gallery/[id]");
  }
}
