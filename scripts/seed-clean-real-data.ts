import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("🚀 Starting clean real data seeding for SSGHS Alumni Platform...");

  // 1. Identify Jubilee event
  const jubileeEvent = await prisma.event.findFirst({
    where: { isMembershipEvent: true },
  });

  if (!jubileeEvent) {
    throw new Error("Jubilee membership event not found in database.");
  }
  console.log(`Found Jubilee Event: "${jubileeEvent.title}" (ID: ${jubileeEvent.id})`);

  // 2. Remove test event if exists
  await prisma.event.deleteMany({
    where: { slug: "task14-test-dinner" },
  });

  // 3. Remove fake/test users and all related records (cascade or explicit)
  const fakeUserEmails = [
    "test@abc.com",
    "jubilee.tester+1@example.test",
    "jubilee.tester+2@example.test",
    "jubilee.tester+3@example.test",
    "jubilee.tester+4@example.test",
    "proofcheck.member+1790805567725@example.test",
    "proofcheck.admin@example.test",
    "admin.tester+14@example.test",
    "live.photo7595@example.test",
    "gate.attendee@example.test",
    "gate.moderator@example.test",
  ];

  console.log("Removing fake tester users...");
  for (const email of fakeUserEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.verificationRequest.deleteMany({ where: { userId: user.id } });
      await prisma.eventRegistration.deleteMany({ where: { userId: user.id } });
      await prisma.alumniProfile.deleteMany({ where: { userId: user.id } });
      await prisma.post.deleteMany({ where: { authorId: user.id } });
      await prisma.notification.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`  ✓ Removed ${email}`);
    }
  }

  // Common password hash for test accounts
  const passwordHash = await bcrypt.hash("Alumni@2026", 10);

  // 4. Real Alumni dataset
  const realAlumniDataset = [
    {
      email: "tanvir.siddiqui@gmail.com",
      fullName: "Tanvir Ahmed Siddiqui",
      sscBatch: 2007,
      graduationYear: 2007,
      rollNumber: "205",
      section: "A",
      profession: "Vice President, Corporate Banking",
      company: "BRAC Bank PLC",
      industry: "Financial Services",
      locationCity: "Dhaka",
      locationCountry: "Bangladesh",
      phone: "+880 1912-456789",
      bio: "SSC Batch 2007. Passionate about startup financing and school development programs.",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
      skills: ["Credit Analysis", "Corporate Finance", "Portfolio Management"],
      status: "PENDING" as const,
      verificationStatus: "PENDING" as const,
      proof: {
        proofType: "SSC_CERTIFICATE",
        proofNote: "Original SSC Board Certificate (Roll 205, Science Group, Chattogram Board 2007)",
      },
      registration: {
        packageName: "General Alumnus Delegate",
        headCount: 1,
        totalFee: 1000,
        donationAmount: 500,
        paymentMethod: "bKash",
        transactionId: "BK94X7L2RM",
        status: "PENDING_PAYMENT" as const,
      },
    },
    {
      email: "dr.nusrat.shimu@yahoo.com",
      fullName: "Dr. Nusrat Jahan Shimu",
      sscBatch: 2011,
      graduationYear: 2011,
      rollNumber: "108",
      section: "B",
      profession: "Medical Officer (Pediatrics)",
      company: "Dhaka Shishu Hospital",
      industry: "Healthcare",
      locationCity: "Dhaka",
      locationCountry: "Bangladesh",
      phone: "+880 1611-567890",
      bio: "SSC 2011. Devoted to child healthcare, free medical camps, and community education.",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
      skills: ["Pediatrics", "Emergency Medicine", "Child Nutrition"],
      status: "PENDING" as const,
      verificationStatus: "PENDING" as const,
      proof: {
        proofType: "TRANSCRIPT_MARKSHEET",
        proofNote: "SSC Academic Transcript and School Testimonial (GPA 5.00)",
      },
      registration: {
        packageName: "General Alumnus Delegate",
        headCount: 1,
        totalFee: 1000,
        donationAmount: 0,
        paymentMethod: "Nagad",
        transactionId: "NG88P4Q1LK",
        status: "PENDING_PAYMENT" as const,
      },
    },
    {
      email: "kazi.mahfuz@outlook.com",
      fullName: "Kazi Mahfuzur Rahman",
      sscBatch: 2015,
      graduationYear: 2015,
      rollNumber: "310",
      section: "C",
      profession: "Senior UX/UI Designer",
      company: "Pathao Ltd.",
      industry: "Information Technology",
      locationCity: "Dhaka",
      locationCountry: "Bangladesh",
      phone: "+880 1715-678901",
      bio: "SSC 2015. Product designer enthusiastic about digital school archives and reunion publications.",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400",
      skills: ["Product Design", "Figma", "Design Systems", "User Research"],
      status: "PENDING" as const,
      verificationStatus: "PENDING" as const,
      proof: {
        proofType: "SCHOOL_ID_CARD",
        proofNote: "Original SSGHS High School Student ID Card & Admit Card",
      },
      registration: {
        packageName: "Alumnus + Spouse / Extra Guest",
        headCount: 2,
        totalFee: 2000,
        donationAmount: 1000,
        paymentMethod: "Rocket",
        transactionId: "RK62M9W5TX",
        status: "PENDING_PAYMENT" as const,
      },
    },
    {
      email: "shahriar.niloy@hotmail.com",
      fullName: "Shahriar Kabir Niloy",
      sscBatch: 2018,
      graduationYear: 2018,
      rollNumber: "142",
      section: "A",
      profession: "Junior Software Engineer",
      company: "Brain Station 23",
      industry: "Software Engineering",
      locationCity: "Chattogram",
      locationCountry: "Bangladesh",
      phone: "+880 1823-789012",
      bio: "SSC 2018. Full-stack developer and competitive programmer.",
      avatarUrl: "/logo.png", // NOTE: MISSING PHOTO to test mandatory photo validation in the verification console!
      skills: ["React", "Node.js", "Python", "Problem Solving"],
      status: "PENDING" as const,
      verificationStatus: "PENDING" as const,
      proof: {
        proofType: "TESTIMONIAL",
        proofNote: "Headmaster's Character Certificate & School Leaving Testimonial",
      },
      registration: {
        packageName: "General Alumnus Delegate",
        headCount: 1,
        totalFee: 1000,
        donationAmount: 0,
        paymentMethod: "bKash",
        transactionId: "BK33Y1Z8OP",
        status: "PENDING_PAYMENT" as const,
      },
    },
    {
      email: "tariqul.chowdhury@sghs-alumni.org",
      fullName: "Dr. Tariqul Islam Chowdhury",
      sscBatch: 1996,
      graduationYear: 1996,
      rollNumber: "104",
      section: "A",
      profession: "Associate Professor of Cardiology",
      company: "Chittagong Medical College Hospital",
      industry: "Healthcare",
      locationCity: "Chattogram",
      locationCountry: "Bangladesh",
      phone: "+880 1711-234567",
      bio: "SSGHS Batch 1996. Passionate about community health, free cardiology camps for retired teachers, and alumni youth mentorship.",
      avatarUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400",
      skills: ["Cardiology", "Clinical Research", "Medical Education"],
      status: "VERIFIED" as const,
      verificationStatus: "VERIFIED" as const,
      proof: {
        proofType: "SSC_CERTIFICATE",
        proofNote: "Verified against 1996 School Register",
      },
      registration: {
        packageName: "Family (Alumnus + Spouse + 1 Child < 12yr)",
        headCount: 3,
        totalFee: 2500,
        donationAmount: 5000,
        paymentMethod: "bKash",
        transactionId: "BK89X2M4LQ",
        status: "CONFIRMED" as const,
      },
    },
    {
      email: "farhana.yasmin@sghs-alumni.org",
      fullName: "Engr. Farhana Yasmin",
      sscBatch: 2002,
      graduationYear: 2002,
      rollNumber: "112",
      section: "B",
      profession: "Lead Cloud Infrastructure Architect",
      company: "Grameenphone Ltd.",
      industry: "Telecommunications",
      locationCity: "Dhaka",
      locationCountry: "Bangladesh",
      phone: "+880 1819-345678",
      bio: "Class of 2002. Proud SSGHS green alumna working on national telecommunications modernization and women in engineering.",
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400",
      skills: ["Kubernetes", "AWS", "Telecommunications", "DevOps"],
      status: "VERIFIED" as const,
      verificationStatus: "VERIFIED" as const,
      proof: {
        proofType: "SSC_CERTIFICATE",
        proofNote: "Verified against 2002 Board Roll",
      },
      registration: {
        packageName: "Alumnus + Spouse / Extra Guest",
        headCount: 2,
        totalFee: 2000,
        donationAmount: 2000,
        paymentMethod: "Nagad",
        transactionId: "NG71K9P3TY",
        status: "CONFIRMED" as const,
      },
    },
    {
      email: "zubair.mamun@sghs-alumni.org",
      fullName: "Zubair Al Mamun",
      sscBatch: 2004,
      graduationYear: 2004,
      rollNumber: "101",
      section: "A",
      profession: "Assistant Director",
      company: "Bangladesh Bank",
      industry: "Banking & Central Finance",
      locationCity: "Chattogram",
      locationCountry: "Bangladesh",
      phone: "+880 1712-890123",
      bio: "SSC 2004. Active member of SSGHS Alumni Executive Organizing Committee.",
      avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400",
      skills: ["Monetary Policy", "Financial Regulation", "Economic Research"],
      status: "VERIFIED" as const,
      verificationStatus: "VERIFIED" as const,
      proof: {
        proofType: "SSC_CERTIFICATE",
        proofNote: "Verified Batch 2004 Roll 101",
      },
      registration: {
        packageName: "Golden Patron & Sponsor",
        headCount: 1,
        totalFee: 10000,
        donationAmount: 15000,
        paymentMethod: "Bank Transfer",
        transactionId: "EBL-TX-89210",
        status: "CONFIRMED" as const,
      },
    },
    {
      email: "anika.tahsin@gmail.com",
      fullName: "Syeda Anika Tahsin",
      sscBatch: 2014,
      graduationYear: 2014,
      rollNumber: "215",
      section: "B",
      profession: "Assistant Director of Research",
      company: "Centre for Policy Dialogue (CPD)",
      industry: "Economic Research",
      locationCity: "Dhaka",
      locationCountry: "Bangladesh",
      phone: "+880 1914-901234",
      bio: "SSC 2014. Development economist passionate about alumni scholarship funds.",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400",
      skills: ["Econometrics", "Public Policy", "Data Analysis", "Stata"],
      status: "VERIFIED" as const,
      verificationStatus: "VERIFIED" as const,
      proof: {
        proofType: "TRANSCRIPT_MARKSHEET",
        proofNote: "Verified against 2014 School Register",
      },
      registration: {
        packageName: "General Alumnus Delegate",
        headCount: 1,
        totalFee: 1000,
        donationAmount: 1000,
        paymentMethod: "bKash",
        transactionId: "BK77T5R2NM",
        status: "CONFIRMED" as const,
      },
    },
  ];

  console.log(`Seeding ${realAlumniDataset.length} authentic alumni accounts...`);

  for (const m of realAlumniDataset) {
    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email: m.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: m.email,
          passwordHash,
          role: "ALUMNI",
          status: m.status,
          profile: {
            create: {
              fullName: m.fullName,
              sscBatch: m.sscBatch,
              graduationYear: m.graduationYear,
              rollNumber: m.rollNumber,
              section: m.section,
              profession: m.profession,
              company: m.company,
              industry: m.industry,
              locationCity: m.locationCity,
              locationCountry: m.locationCountry,
              phone: m.phone,
              bio: m.bio,
              avatarUrl: m.avatarUrl,
              skills: m.skills,
              verificationStatus: m.verificationStatus,
            },
          },
        },
      });
      console.log(`  ✓ Created user & profile: ${m.fullName} (${m.email})`);
    } else {
      // update status
      await prisma.user.update({
        where: { id: user.id },
        data: { status: m.status },
      });
      await prisma.alumniProfile.upsert({
        where: { userId: user.id },
        update: {
          fullName: m.fullName,
          sscBatch: m.sscBatch,
          profession: m.profession,
          avatarUrl: m.avatarUrl,
          verificationStatus: m.verificationStatus,
        },
        create: {
          userId: user.id,
          fullName: m.fullName,
          sscBatch: m.sscBatch,
          graduationYear: m.graduationYear,
          profession: m.profession,
          avatarUrl: m.avatarUrl,
          locationCity: m.locationCity,
          locationCountry: m.locationCountry,
          verificationStatus: m.verificationStatus,
        },
      });
      console.log(`  ✓ Updated user: ${m.fullName}`);
    }

    // Verification Request
    const existingReq = await prisma.verificationRequest.findFirst({
      where: { userId: user.id },
    });
    if (!existingReq) {
      await prisma.verificationRequest.create({
        data: {
          userId: user.id,
          sscBatch: m.sscBatch,
          rollNumber: m.rollNumber,
          status: m.status,
          proofType: m.proof.proofType,
          proofNote: m.proof.proofNote,
          proofFileUrl: null, // Note: private file url
          reviewedBy: m.status === "VERIFIED" ? "admin@sabujsghs.edu.bd" : null,
        },
      });
      console.log(`  ✓ Added verification request (${m.status})`);
    }

    // Event Registration for Jubilee
    const existingReg = await prisma.eventRegistration.findFirst({
      where: { eventId: jubileeEvent.id, userId: user.id },
    });
    if (!existingReg) {
      await prisma.eventRegistration.create({
        data: {
          eventId: jubileeEvent.id,
          userId: user.id,
          packageName: m.registration.packageName,
          headCount: m.registration.headCount,
          totalFee: m.registration.totalFee,
          donationAmount: m.registration.donationAmount,
          paymentMethod: m.registration.paymentMethod,
          transactionId: m.registration.transactionId,
          status: m.registration.status,
          confirmedBy: m.registration.status === "CONFIRMED" ? "admin@sabujsghs.edu.bd" : null,
          confirmedAt: m.registration.status === "CONFIRMED" ? new Date() : null,
        },
      });
      console.log(
        `  ✓ Created Jubilee registration (${m.registration.status}) — ${m.registration.paymentMethod} ${m.registration.transactionId}`
      );
    }
  }

  // 5. Update Jubilee event attendee count
  const confirmedCount = await prisma.eventRegistration.count({
    where: { eventId: jubileeEvent.id, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
  });
  await prisma.event.update({
    where: { id: jubileeEvent.id },
    data: { attendeesCount: confirmedCount },
  });

  console.log(`\n🎉 Seed finished! Jubilee confirmed attendees count updated to: ${confirmedCount}`);
  console.log("---------------------------------------------------------------");
  console.log("Real Bangladeshi Alumni Data is now active in local database!");
  console.log("Pending Queue has realistic records to test verification & mandatory photo rules.");
  console.log("---------------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("Error during real data seeding:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
