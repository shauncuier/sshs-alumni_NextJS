import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/session-user";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { requireRateLimit, requireSameOrigin, readJsonBody } from "@/lib/request-security";
import { AppError } from "@/lib/app-error";
import { readVerifiedPhone } from "@/lib/phone-otp";
import { canonicalPhone, isPhoneClash, PHONE_TAKEN_MESSAGE, requirePhoneFree } from "@/lib/phone-registry";
import { normalizeBloodGroup } from "@/lib/members/blood-groups";
import type { Prisma } from "@prisma/client";
import { normalizeEducation } from "@/lib/members/education";
import { normalizeExperience } from "@/lib/members/experience";

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

    const body = await readJsonBody(req);
    const {
      fullName,
      profession,
      company,
      designation,
      address,
      industry,
      locationCity,
      locationCountry,
      rollNumber,
      bloodGroup,
      education,
      experience,
      section,
      bio,
      phone,
      phoneVerificationToken,
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
    const clip = (value: string | null | undefined, max: number) => (typeof value === "string" ? value.slice(0, max) : value);

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

      // A new mobile number must be proved by SMS code and belong to nobody else.
      // An unchanged number (in any format) and an empty field leave it as it is.
      const current = await prisma.alumniProfile.findUnique({ where: { userId: user.id }, select: { phone: true } });
      let newPhone: string | undefined;
      if (typeof phone === "string" && phone.trim()) {
        const wanted = canonicalPhone(phone);
        const before = current?.phone ? current.phone.replace(/\D/g, "").slice(-10) : null;
        if (before !== wanted.slice(1)) {
          if (!phoneVerificationToken || readVerifiedPhone(phoneVerificationToken) !== wanted) {
            throw new AppError("PHONE_NOT_VERIFIED", 400, "Please verify your new mobile number with the SMS code first.");
          }
          await requirePhoneFree(wanted, { exceptUserId: user.id });
          newPhone = wanted;
        }
      }

      // Optional; undefined leaves it as it is, an empty value clears it.
      const blood = bloodGroup === undefined ? undefined : normalizeBloodGroup(bloodGroup);
      if (bloodGroup !== undefined && blood === undefined) {
        throw new AppError("INVALID_BLOOD_GROUP", 400, "Please choose a blood group from the list, or leave it empty.");
      }

      // Education after SSC: undefined leaves it as it is.
      const educationList = education === undefined ? undefined : normalizeEducation(education);
      // Work experience: the current job (newest "I currently work here") also becomes the
      // profile's designation and company, which directory cards and the header show.
      const experienceList = experience === undefined ? undefined : normalizeExperience(experience);
      const currentJob = experienceList?.find((e) => e.current);

      const batchYear = (session.user as unknown as { batchYear?: number })?.batchYear;
      if (!batchYear) {
        const existing = await prisma.alumniProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
        if (!existing) {
          return NextResponse.json({ error: "Your SSC batch is not on record yet. Please contact the alumni committee." }, { status: 409 });
        }
      }
      const updated = await prisma.alumniProfile.upsert({
        where: { userId: user.id },
        update: {
          fullName: required(fullName),
          profession: required(profession),
          locationCity: required(locationCity),
          locationCountry: optional(locationCountry) || undefined,
          company: optional(company) ?? currentJob?.company,
          designation: clip(optional(designation), 100) ?? currentJob?.title,
          address: clip(optional(address), 255),
          industry: optional(industry),
          rollNumber: optional(rollNumber),
          bloodGroup: blood,
          education: educationList as unknown as Prisma.InputJsonValue | undefined,
          experience: experienceList as unknown as Prisma.InputJsonValue | undefined,
          section: optional(section),
          bio: optional(bio),
          phone: newPhone,
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
          sscBatch: batchYear ?? 0,
          graduationYear: batchYear ?? 0,
          profession: required(profession) || "Alumnus",
          locationCity: required(locationCity) || "Chattogram",
          locationCountry: optional(locationCountry) || "Bangladesh",
          company: optional(company) ?? null,
          designation: clip(optional(designation), 100) ?? null,
          address: clip(optional(address), 255) ?? null,
          industry: optional(industry) ?? null,
          rollNumber: optional(rollNumber) ?? null,
          bloodGroup: blood ?? null,
          education: (educationList ?? []) as unknown as Prisma.InputJsonValue,
          experience: (experienceList ?? []) as unknown as Prisma.InputJsonValue,
          section: optional(section) ?? null,
          bio: optional(bio) ?? null,
          phone: newPhone ?? null,
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

      await logActivity({
        category: "ACCOUNT",
        action: "profile.updated",
        summary: `${session.user.email} updated their profile`,
        actor: { id: session.user.id, email: session.user.email, role: session.user.role },
        targetType: "AlumniProfile",
        targetId: updated.id,
        metadata: { fields: Object.keys(body).filter((k) => body[k] !== undefined) },
        req,
      });
      return NextResponse.json({ message: "Profile updated successfully", profile: updated });
    } catch (dbErr) {
      if (dbErr instanceof AppError) throw dbErr;
      if (isPhoneClash(dbErr)) throw new AppError("PHONE_TAKEN", 409, PHONE_TAKEN_MESSAGE);
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
