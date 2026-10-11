import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { addPhoto } from "@/lib/gallery";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireGalleryAdmin } from "@/lib/admin/gallery-auth";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/gallery/[id]/photos — add an uploaded image ({ imageUrl, caption }) to the album.
export async function POST(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireGalleryAdmin();
    const albumId = (await params).id;
    const photo = await addPhoto(albumId, await readJsonBody(req), me.email);
    await logActivity({ category: "CONTENT", action: "photo.added", summary: `Added a photo to gallery album ${albumId}`, actor: me, targetType: "GalleryPhoto", targetId: photo.id, metadata: { albumId }, req });
    return NextResponse.json({ photo }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/gallery/[id]/photos");
  }
}
