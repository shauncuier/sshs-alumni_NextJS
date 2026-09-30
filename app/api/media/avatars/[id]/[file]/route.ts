import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { avatarFilePath, type AvatarFile } from "@/lib/media/avatars";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

type Params = { params: Promise<{ id: string; file: string }> };

const notFound = () => NextResponse.json({ error: "Not found." }, { status: 404 });

/**
 * Member photos live on the server disk. The 400x400 web avatar is public (the
 * id is an unguessable random value); the print master is for admins only.
 */
export async function GET(_req: Request, { params }: Params) {
  const { id, file } = await params;
  if (file !== "avatar.webp" && file !== "original.jpg") return notFound();
  const path = avatarFilePath(id, file as AvatarFile);
  if (!path) return notFound();

  const headers: Record<string, string> = { "X-Content-Type-Options": "nosniff" };
  if (file === "original.jpg") {
    const me = await getSessionUser();
    if (!me || !isAdminRole(me.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    headers["Content-Type"] = "image/jpeg";
    headers["Cache-Control"] = "private, no-store";
    headers["Content-Disposition"] = `inline; filename="member-photo-${id}.jpg"`;
  } else {
    headers["Content-Type"] = "image/webp";
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  }

  try {
    return new NextResponse(new Uint8Array(await fs.readFile(path)), { headers });
  } catch {
    return notFound();
  }
}
