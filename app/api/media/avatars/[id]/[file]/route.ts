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
// Smaller copies for lists and headers (lib/avatar.ts avatarAt); made on first request.
const SIZES = new Set([96, 192]);

async function sizedCopy(original: string, size: number): Promise<Buffer> {
  const copy = original.replace(/avatar\.webp$/, `avatar-${size}.webp`);
  try {
    return await fs.readFile(copy);
  } catch {
    const sharp = (await import("sharp")).default;
    const data = await sharp(original).resize(size, size, { fit: "cover" }).webp({ quality: 72 }).toBuffer();
    await fs.writeFile(copy, data).catch(() => {}); // A failed write only means resizing again next time.
    return data;
  }
}

export async function GET(req: Request, { params }: Params) {
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
    const size = Number(new URL(req.url).searchParams.get("s"));
    if (file === "avatar.webp" && SIZES.has(size)) {
      return new NextResponse(new Uint8Array(await sizedCopy(path, size)), { headers });
    }
    return new NextResponse(new Uint8Array(await fs.readFile(path)), { headers });
  } catch {
    return notFound();
  }
}
