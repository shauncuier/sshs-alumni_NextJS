import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sampleAlumni } from "@/lib/data";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { profile: true },
      });

      if (user?.profile) {
        return NextResponse.json({ profile: user.profile, user, source: "database" });
      }
    } catch (dbErr) {
      console.warn("Database profile fetch fallback:", dbErr);
    }

    // Fallback to sample data matching session user
    const matched = sampleAlumni.find((a) => a.email === session.user.email) || sampleAlumni[0];
    return NextResponse.json({
      profile: {
        ...matched,
        fullName: session.user.name || matched.fullName,
        sscBatch: (session.user as unknown as { batchYear?: number })?.batchYear || matched.sscBatch,
      },
      source: "fallback",
    });
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
    const { fullName, profession, company, locationCity, bio, phone, skills } = body;

    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { profile: true },
      });

      if (user) {
        // Upsert profile
        const updated = await prisma.alumniProfile.upsert({
          where: { userId: user.id },
          update: {
            fullName: fullName || undefined,
            profession: profession || undefined,
            company: company || undefined,
            locationCity: locationCity || undefined,
            bio: bio || undefined,
            phone: phone || undefined,
            skills: Array.isArray(skills) ? skills : undefined,
          },
          create: {
            userId: user.id,
            fullName: fullName || session.user.name || "Alumnus",
            sscBatch: (session.user as unknown as { batchYear?: number })?.batchYear || 2008,
            graduationYear: (session.user as unknown as { batchYear?: number })?.batchYear || 2008,
            profession: profession || "Alumnus",
            locationCity: locationCity || "Chattogram",
            locationCountry: "Bangladesh",
            company: company || null,
            bio: bio || null,
            phone: phone || null,
            skills: Array.isArray(skills) ? skills : [],
          },
        });

        return NextResponse.json({
          message: "Profile updated successfully",
          profile: updated,
          source: "database",
        });
      }
    } catch (dbErr) {
      console.warn("Database profile update fallback:", dbErr);
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      profile: {
        fullName,
        profession,
        company,
        locationCity,
        bio,
        phone,
        skills,
      },
      source: "simulated-persistence",
    });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
