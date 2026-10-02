import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/session-user";
import prisma from "@/lib/prisma";
import { AVATAR_LIMITS, processAvatar, saveAvatar } from "@/lib/media/avatars";
import { AppError } from "@/lib/app-error";

export async function POST(req: Request) {
  try {
    const session = await getMemberSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("photo") || formData.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Please select an image file" }, { status: 400 });
    }

    if (file.size > AVATAR_LIMITS.maxBytes) {
      return NextResponse.json(
        { error: "The photo must be 5 MB or smaller." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let processed;
    try {
      processed = await processAvatar(buffer);
    } catch (processErr) {
      if (processErr instanceof AppError) {
        return NextResponse.json({ error: processErr.message }, { status: processErr.status });
      }
      return NextResponse.json(
        { error: "Invalid image. Photo must be JPEG, PNG or WebP and at least 600 × 600 pixels." },
        { status: 400 }
      );
    }

    const saved = await saveAvatar(processed);

    const updated = await prisma.alumniProfile.update({
      where: { userId: user.id },
      data: {
        avatarUrl: saved.avatarUrl,
        avatarOriginalUrl: saved.originalUrl,
      },
      select: {
        avatarUrl: true,
        avatarOriginalUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: updated.avatarUrl,
      originalUrl: updated.avatarOriginalUrl,
    });
  } catch (error) {
    console.error("[Profile Avatar POST Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getMemberSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await prisma.alumniProfile.update({
      where: { userId: user.id },
      data: {
        avatarUrl: null,
        avatarOriginalUrl: null,
      },
    });

    return NextResponse.json({ success: true, avatarUrl: null });
  } catch (error) {
    console.error("[Profile Avatar DELETE Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
