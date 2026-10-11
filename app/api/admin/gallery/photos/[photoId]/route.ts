import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { deletePhoto, updatePhoto } from "@/lib/gallery";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireGalleryAdmin } from "@/lib/admin/gallery-auth";

type Params = { params: Promise<{ photoId: string }> };

// PATCH /api/admin/gallery/photos/[photoId] — change the caption or position.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    await requireGalleryAdmin();
    return NextResponse.json({ photo: await updatePhoto((await params).photoId, await readJsonBody(req)) });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/gallery/photos/[photoId]");
  }
}

// DELETE /api/admin/gallery/photos/[photoId] — remove the photo and its files.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireGalleryAdmin();
    const photoId = (await params).photoId;
    const { albumId, albumTitle } = await deletePhoto(photoId, me.email);
    await logActivity({ category: "CONTENT", action: "photo.deleted", summary: `Deleted a photo from gallery album "${albumTitle}"`, actor: me, targetType: "GalleryPhoto", targetId: photoId, metadata: { albumId }, req });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/gallery/photos/[photoId]");
  }
}
