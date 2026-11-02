import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRateLimit } from "@/lib/request-security";
import { AppError } from "@/lib/app-error";
import { shownAvatar } from "@/lib/members/photo-privacy";
import { getSessionUser } from "@/lib/session-user";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    requireRateLimit(req, "alumni-profile", { limit: 120, windowMs: 60_000 });
    const { id } = await props.params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid alumni ID" }, { status: 400 });
    }

    const profile = await prisma.alumniProfile.findFirst({
      where: {
        OR: [{ slug: id }, { id }, { userId: id }],
        verificationStatus: "VERIFIED",
      },
      select: {
        id: true,
        userId: true,
        slug: true,
        fullName: true,
        sscBatch: true,
        graduationYear: true,
        section: true,
        profession: true,
        company: true,
        industry: true,
        locationCity: true,
        locationCountry: true,
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        skills: true,
        linkedin: true,
        facebook: true,
        github: true,
        website: true,
        schoolMemories: true,
        contributions: true,
        verificationStatus: true,
        createdAt: true,
        phone: true,
        isPhonePublic: true,
        isEmailPublic: true,
        gender: true,
        isPhotoPublic: true,
        user: { select: { email: true, role: true } },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Alumni profile not found" }, { status: 404 });
    }

    const { phone, isPhonePublic, isEmailPublic, gender, isPhotoPublic, user, ...rest } = profile;
    const viewer = await getSessionUser().catch(() => null);
    const alumni = {
      ...rest,
      avatarUrl: shownAvatar(rest.avatarUrl, { userId: rest.userId, gender, isPhotoPublic }, viewer),
      phone: isPhonePublic ? phone : null,
      isPhonePublic,
      isEmailPublic,
      email: isEmailPublic ? user.email : null,
      role: user.role,
    };

    return NextResponse.json({ alumni });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("API error [GET /api/alumni/[id]]:", error);
    return NextResponse.json({ error: "Failed to fetch alumni profile" }, { status: 500 });
  }
}
