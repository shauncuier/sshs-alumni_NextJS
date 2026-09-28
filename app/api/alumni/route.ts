import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

// Public directory: only fields a member would expect strangers to see.
// Phone and email appear only when the member has made them public; the school
// roll number is used for verification and is never listed.
const DIRECTORY_FIELDS = {
  id: true,
  userId: true,
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
  verificationStatus: true,
  createdAt: true,
  phone: true,
  isPhonePublic: true,
  isEmailPublic: true,
  user: { select: { email: true, role: true } },
} satisfies Prisma.AlumniProfileSelect;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const batch = searchParams.get("batch");
    const profession = searchParams.get("profession");
    const location = searchParams.get("location");
    const verifiedOnly = searchParams.get("verified") === "true";

    const filters: Prisma.AlumniProfileWhereInput[] = [
      // Members the committee rejected are never listed.
      verifiedOnly ? { verificationStatus: "VERIFIED" } : { verificationStatus: { not: "REJECTED" } },
    ];
    if (batch && batch !== "all" && !Number.isNaN(parseInt(batch, 10))) {
      filters.push({ sscBatch: parseInt(batch, 10) });
    }
    if (profession && profession !== "all") {
      filters.push({ profession: { contains: profession } });
    }
    if (location && location !== "all") {
      filters.push({ OR: [{ locationCity: { contains: location } }, { locationCountry: { contains: location } }] });
    }
    if (q) {
      filters.push({
        OR: [
          { fullName: { contains: q } },
          { profession: { contains: q } },
          { company: { contains: q } },
          { locationCity: { contains: q } },
        ],
      });
    }

    let profiles;
    try {
      profiles = await prisma.alumniProfile.findMany({
        where: { AND: filters },
        select: DIRECTORY_FIELDS,
        orderBy: { sscBatch: "desc" },
      });
    } catch (dbErr) {
      console.error("Alumni directory query failed:", dbErr);
      return NextResponse.json({ error: "The alumni directory is unavailable right now." }, { status: 503 });
    }

    const alumni = profiles.map(({ phone, isPhonePublic, isEmailPublic, user, ...rest }) => ({
      ...rest,
      phone: isPhonePublic ? phone : null,
      isPhonePublic,
      isEmailPublic,
      user: { email: isEmailPublic ? user.email : null, role: user.role },
    }));

    return NextResponse.json({ alumni, total: alumni.length, source: "database" });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to fetch alumni directory" }, { status: 500 });
  }
}
