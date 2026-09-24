import { PrismaClient, Role, VerificationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting SSGHS Alumni database seed for MongoDB Compass...");

  // 1. Hash passwords
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const userPasswordHash = await bcrypt.hash("password123", 10);

  // 2. Seed Admin User
  console.log("Creating Executive Admin user: admin@sabujsghs.edu.bd ...");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@sabujsghs.edu.bd" },
    update: {},
    create: {
      email: "admin@sabujsghs.edu.bd",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      status: VerificationStatus.VERIFIED,
      profile: {
        create: {
          fullName: "SSGHS Executive Council Secretariat",
          sscBatch: 1995,
          graduationYear: 1995,
          profession: "Association General Secretary",
          company: "Sabuj Shikshayatan Govt. High School",
          locationCity: "Chattogram",
          locationCountry: "Bangladesh",
          bio: "Official administrative management of SSGHS Alumni Association.",
          avatarUrl: "/logo.png",
          verificationStatus: VerificationStatus.VERIFIED,
        },
      },
    },
  });

  // 3. Seed Verified Alumni User
  console.log("Creating Verified Alumni user: jashedul@example.com ...");
  const alumniUser = await prisma.user.upsert({
    where: { email: "jashedul@example.com" },
    update: {},
    create: {
      email: "jashedul@example.com",
      passwordHash: userPasswordHash,
      role: Role.ALUMNI,
      status: VerificationStatus.VERIFIED,
      profile: {
        create: {
          fullName: "Md. Jashedul Hoque",
          sscBatch: 2008,
          graduationYear: 2008,
          profession: "Senior Software Engineer",
          company: "Databricks / Cloud Systems",
          industry: "Information Technology",
          locationCity: "Dhaka",
          locationCountry: "Bangladesh",
          rollNumber: "101",
          section: "A",
          bio: "SSGHS Batch 2008 alumnus passionate about software architecture, community mentoring, and education reform.",
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
          skills: ["Next.js", "TypeScript", "System Architecture", "Cloud Infrastructure"],
          verificationStatus: VerificationStatus.VERIFIED,
        },
      },
    },
  });

  // 4. Seed Batches (1985 to 2025)
  console.log("Seeding Batches from 1985 to 2025...");
  const batchYears = Array.from({ length: 41 }, (_, i) => 1985 + i);
  for (const year of batchYears) {
    await prisma.batch.upsert({
      where: { year },
      update: {},
      create: {
        year,
        name: `SSC Batch ${year}`,
        tagline: `Proud alumni of Sabuj Shikshayatan Government High School Class of ${year}`,
        totalMembers: Math.floor(Math.random() * 80) + 40,
        classRepresentative: `Representative Batch ${year}`,
        reunionCount: year < 2015 ? Math.floor(Math.random() * 5) + 1 : 0,
      },
    });
  }

  // 5. Seed Events
  console.log("Seeding Upcoming Events & Reunions...");
  const eventsData = [
    {
      title: "Grand Alumni Reunion 2026: 40 Years of Excellence",
      slug: "grand-alumni-reunion-2026",
      category: "REUNION" as const,
      date: new Date("2026-11-20T09:00:00.000Z"),
      venue: "Main Campus Auditorium & Grounds, SSGHS, Chattogram",
      description:
        "The flagship quadrennial gathering of all batches from 1985 to 2025. Featuring alumni awards, memorial tribute, cultural night, batch stalls, and feast.",
      bannerUrl:
        "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1200",
      totalSeats: 2500,
      confirmedSeats: 1420,
      registrationFee: 1500,
    },
    {
      title: "SSGHS Inter-Batch Football Carnival 2026",
      slug: "inter-batch-football-carnival-2026",
      category: "SPORTS" as const,
      date: new Date("2026-12-12T08:00:00.000Z"),
      venue: "School Football Field & Sports Pavilion",
      description:
        "32 alumni batches competing for the coveted SSGHS Champion Shield. Day-long sports carnival with live commentary and food pavilion.",
      bannerUrl:
        "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200",
      totalSeats: 500,
      confirmedSeats: 340,
      registrationFee: 500,
    },
    {
      title: "Tech & Career Leadership Summit 2026",
      slug: "tech-career-leadership-summit-2026",
      category: "WEBINAR" as const,
      date: new Date("2026-10-05T14:00:00.000Z"),
      venue: "Virtual via Zoom & SSGHS Media Center",
      description:
        "Distinguished SSGHS alumni leaders in Tech, Medicine, and Civil Service share mentorship and global career roadmaps with young graduates.",
      bannerUrl:
        "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1200",
      totalSeats: 1000,
      confirmedSeats: 620,
      registrationFee: 0,
    },
  ];

  for (const ev of eventsData) {
    await prisma.event.upsert({
      where: { slug: ev.slug },
      update: {},
      create: ev,
    });
  }

  // 6. Seed Donation Campaigns
  console.log("Seeding Transparent Giving Back Campaigns...");
  const campaigns = [
    {
      title: "Needy Student Merit Scholarship Endowment",
      slug: "student-merit-scholarship",
      category: "SCHOLARSHIP" as const,
      targetAmount: 500000,
      raisedAmount: 385000,
      donorCount: 142,
      description:
        "Providing full annual tuition, books, and uniforms for 50 meritorious students facing economic hardships at Sabuj Shikshayatan Govt. High School.",
      imageUrl:
        "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=1000",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    },
    {
      title: "Modern STEM & Computer Science Lab Modernization",
      slug: "modern-stem-lab",
      category: "STEM_LAB" as const,
      targetAmount: 800000,
      raisedAmount: 640000,
      donorCount: 98,
      description:
        "Equipping the campus science lab with 25 modern computers, robotics kits, and high-speed internet to prepare students for the 4th Industrial Revolution.",
      imageUrl:
        "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80&w=1000",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-11-30"),
    },
  ];

  for (const cp of campaigns) {
    await prisma.donationCampaign.upsert({
      where: { slug: cp.slug },
      update: {},
      create: cp,
    });
  }

  console.log("✅ SSGHS Alumni database seeded successfully!");
  console.log("--------------------------------------------------");
  console.log("MongoDB Compass Connection String: mongodb://localhost:27017");
  console.log("Database Name:                     sshs_alumni");
  console.log("Pre-seeded Admin User:             admin@sabujsghs.edu.bd / admin123");
  console.log("Pre-seeded Alumni User:            jashedul@example.com / password123");
  console.log("--------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
