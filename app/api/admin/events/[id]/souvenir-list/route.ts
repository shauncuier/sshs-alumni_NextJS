import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { souvenirList, souvenirZipFiles } from "@/lib/events/souvenir-list";
import { getSessionUser, isAdminRole } from "@/lib/session-user";
import { zipStream } from "@/lib/zip";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/events/[id]/souvenir-list — one zip for the souvenir book: the paid
// members as Excel (batch, name, profession/designation, mobile, blood group, photo file)
// and their photos. It holds phone numbers and photos, so every download is logged.
// Streamed photo by photo, so a long list never sits in the server's memory at once.
export async function GET(req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) return NextResponse.json({ error: "Only administrators can export the souvenir list." }, { status: 403 });
  try {
    const id = (await params).id;
    const { event, rows } = await souvenirList(id);
    const photos = rows.filter((r) => r.photo).length;
    await logActivity({
      category: "EVENT",
      action: "event.souvenir_list_exported",
      summary: `Downloaded the souvenir list of "${event.title}" (${rows.length} members, ${photos} photos)`,
      actor: me,
      targetType: "Event",
      targetId: id,
      metadata: { rows: rows.length, photos },
      req,
    });
    const base = `${event.slug.replace(/[^a-z0-9-]/gi, "") || "event"}-souvenir`;
    return new NextResponse(zipStream(souvenirZipFiles(rows, `${base}-list.xlsx`)), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${base}.zip"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/events/[id]/souvenir-list");
  }
}
