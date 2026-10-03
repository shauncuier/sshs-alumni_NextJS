import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/session-user";
import prisma from "@/lib/prisma";
import { requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { AppError } from "@/lib/app-error";

export async function GET() {
  try {
    const session = await getMemberSession();
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
    requireSameOrigin(req);
    requireRateLimit(req, "profile-update", { limit: 20, windowMs: 60_000 });

    const session = await getMemberSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      fullName,
      profession,
      company,
      industry,
      locationCity,
      locationCountry,
      rollNumber,
      section,
      bio,
      phone,
      skills,
      linkedin,
      facebook,
      github,
      website,
      schoolMemories,
      contributions,
      isPhonePublic,
      isEmailPublic,
    } = body;

    // Optional text fields: undefined leaves the value as is, an empty string clears it.
    const optional = (value: unknown) =>
      value === undefined ? undefined : typeof value === "string" && value.trim() ? value.trim() : null;
    const required = (value: unknown) =>
      typeof value === "string" && value.trim() ? value.trim() : undefined;

    // Strict URL validator: prevents javascript:, data:, and malicious protocol schemes
    const safeUrl = (value: unknown): string | null | undefined => {
      if (value === undefined) return undefined;
      if (typeof value !== "string" || !value.trim()) return null;
      const trimmed = value.trim();
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          return parsed.href;
        }
        return null;
      } catch {
        if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
          return `https://${trimmed}`;
        }
        return null;
      }
    };

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
          locationCountry: optional(locationCountry) || undefined,
          company: optional(company),
          industry: optional(industry),
          rollNumber: optional(rollNumber),
          section: optional(section),
          bio: optional(bio),
          phone: optional(phone),
          skills: Array.isArray(skills) ? skills : undefined,
          linkedin: safeUrl(linkedin),
          facebook: safeUrl(facebook),
          github: safeUrl(github),
          website: safeUrl(website),
          schoolMemories: optional(schoolMemories),
          contributions: optional(contributions),
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
          locationCountry: optional(locationCountry) || "Bangladesh",
          company: optional(company) ?? null,
          industry: optional(industry) ?? null,
          rollNumber: optional(rollNumber) ?? null,
          section: optional(section) ?? null,
          bio: optional(bio) ?? null,
          phone: optional(phone) ?? null,
          skills: Array.isArray(skills) ? skills : [],
          linkedin: safeUrl(linkedin) ?? null,
          facebook: safeUrl(facebook) ?? null,
          github: safeUrl(github) ?? null,
          website: safeUrl(website) ?? null,
          schoolMemories: optional(schoolMemories) ?? null,
          contributions: optional(contributions) ?? null,
          isPhonePublic: typeof isPhonePublic === "boolean" ? isPhonePublic : false,
          isEmailPublic: typeof isEmailPublic === "boolean" ? isEmailPublic : false,
        },
      });

      return NextResponse.json({ message: "Profile updated successfully", profile: updated });
    } catch (dbErr) {
      console.error("Profile update failed:", dbErr);
      return NextResponse.json({ error: "Could not save your profile. Please try again." }, { status: 503 });
    }
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
