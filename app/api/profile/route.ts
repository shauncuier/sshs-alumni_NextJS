import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        // Only account fields the profile page needs; never the password hash.
        select: { id: true, email: true, role: true, status: true, createdAt: true, profile: true },
      });
    } catch (dbErr) {
      console.error("Profile fetch failed:", dbErr);
      return NextResponse.json({ error: "Could not load your profile. Please try again." }, { status: 503 });
    }

    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    const { profile, ...account } = user;
    return NextResponse.json({ profile, user: account });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, profession, company, locationCity, bio, phone, skills, isPhonePublic, isEmailPublic } = body;

    // Optional text fields: undefined leaves the value as is, an empty string clears it.
    const optional = (value: unknown) =>
      value === undefined ? undefined : typeof value === "string" && value.trim() ? value.trim() : null;
    const required = (value: unknown) =>
      typeof value === "string" && value.trim() ? value.trim() : undefined;

    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (!user) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      const batchYear = (session.user as unknown as { batchYear?: number })?.batchYear || 2008;
      const updated = await prisma.alumniProfile.upsert({
        where: { userId: user.id },
        update: {
          fullName: required(fullName),
          profession: required(profession),
          locationCity: required(locationCity),
          company: optional(company),
          bio: optional(bio),
          phone: optional(phone),
          skills: Array.isArray(skills) ? skills : undefined,
          isPhonePublic: typeof isPhonePublic === "boolean" ? isPhonePublic : undefined,
          isEmailPublic: typeof isEmailPublic === "boolean" ? isEmailPublic : undefined,
        },
        create: {
          userId: user.id,
          fullName: required(fullName) || session.user.name || "Alumnus",
          sscBatch: batchYear,
          graduationYear: batchYear,
          profession: required(profession) || "Alumnus",
          locationCity: required(locationCity) || "Chattogram",
          locationCountry: "Bangladesh",
          company: optional(company) ?? null,
          bio: optional(bio) ?? null,
          phone: optional(phone) ?? null,
          skills: Array.isArray(skills) ? skills : [],
        },
      });

      return NextResponse.json({ message: "Profile updated successfully", profile: updated });
    } catch (dbErr) {
      console.error("Profile update failed:", dbErr);
      return NextResponse.json({ error: "Could not save your profile. Please try again." }, { status: 503 });
    }
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
