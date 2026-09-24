import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fullName,
      email,
      password,
      batchYear,
      profession,
      company,
      locationCity,
      locationCountry,
      phone,
      studentIdOrRoll,
      nidNumber,
      bio,
    } = body;

    if (!fullName || !email || !password || !batchYear) {
      return NextResponse.json(
        { error: "Please fill in all required fields (Full Name, Email, Password, Batch Year)." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const batchInt = parseInt(String(batchYear), 10) || 2015;

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    // Hash the password with bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user and profile transaction
    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        role: "ALUMNI",
        status: "PENDING",
        profile: {
          create: {
            fullName: fullName.trim(),
            sscBatch: batchInt,
            graduationYear: batchInt,
            profession: profession?.trim() || "Alumnus",
            company: company?.trim() || null,
            locationCity: locationCity?.trim() || "Chattogram",
            locationCountry: locationCountry?.trim() || "Bangladesh",
            phone: phone?.trim() || null,
            rollNumber: studentIdOrRoll?.trim() || null,
            bio: bio?.trim() || `Alumnus of SSGHS Batch ${batchInt}`,
            verificationStatus: "PENDING",
            avatarUrl: "/logo.png",
          },
        },
        verificationRequests: {
          create: {
            submittedBatch: batchInt,
            studentRoll: studentIdOrRoll?.trim() || null,
            nidOrBirthReg: nidNumber?.trim() || null,
            status: "PENDING",
          },
        },
      },
      include: {
        profile: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Registration submitted successfully! Your account is pending verification.",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.profile?.fullName,
          batchYear: newUser.profile?.sscBatch,
          status: newUser.status,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred while creating your account. Please try again later." },
      { status: 500 }
    );
  }
}
