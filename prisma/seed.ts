import "dotenv/config";
import { Role, VerificationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

// Earlier seeds created these accounts with published passwords; replace them on sight.
const LEGACY_ADMIN = { email: "admin@sabujsghs.edu.bd", password: "admin123" };
const LEGACY_ALUMNI = { email: "jashedul@example.com", password: "password123" };
const MIN_SEED_PASSWORD_LENGTH = 12;

// Seed emails may be configured; they are not secret, so the old addresses are the default.
// Sign-in lowercases the entered email, so store it lowercased or it could never match.
function emailFromEnv(envVar: string, fallback: string): string {
  const email = (process.env[envVar] || fallback).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${envVar} is not a valid email address.`);
  }
  return email;
}

// Seed passwords come only from the environment: a default in the source would
// give every seeded database logins anyone can look up.
function passwordFromEnv(envVar: string, legacyPassword: string): string {
  const password = process.env[envVar];
  if (!password) {
    throw new Error(`${envVar} is not set. Set it in .env before running the seed.`);
  }
  if (password.length < MIN_SEED_PASSWORD_LENGTH || password === legacyPassword) {
    throw new Error(
      `${envVar} must be at least ${MIN_SEED_PASSWORD_LENGTH} characters and not the old default.`
    );
  }
  return password;
}

// An account created by an earlier seed may still have its published password.
// Replace only that; a password someone has since changed is left alone.
async function replaceLegacyPassword(
  email: string,
  legacyPassword: string,
  newPasswordHash: string,
  envVar: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  if (user && (await bcrypt.compare(legacyPassword, user.passwordHash))) {
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newPasswordHash } });
    console.log(`Replaced the old default password for ${email} with ${envVar}.`);
  }
}

async function main() {
  console.log("🌱 Starting SSGHS Alumni database seed for MySQL...");

  // 1. Hash passwords
  // Read all settings before touching the database, so a bad value writes nothing.
  const adminEmail = emailFromEnv("SEED_ADMIN_EMAIL", LEGACY_ADMIN.email);
  const alumniEmail = emailFromEnv("SEED_ALUMNI_EMAIL", LEGACY_ALUMNI.email);
  if (adminEmail === alumniEmail) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ALUMNI_EMAIL must be different addresses.");
  }
  const adminPassword = passwordFromEnv("SEED_ADMIN_PASSWORD", LEGACY_ADMIN.password);
  const alumniPassword = passwordFromEnv("SEED_ALUMNI_PASSWORD", LEGACY_ALUMNI.password);
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const userPasswordHash = await bcrypt.hash(alumniPassword, 10);

  // 2. Seed Admin User
  console.log(`Creating Executive Admin user: ${adminEmail} ...`);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
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

  // Also check the old address: if the email was changed, an admin created by an
  // earlier seed would otherwise keep the published password.
  await replaceLegacyPassword(adminEmail, LEGACY_ADMIN.password, adminPasswordHash, "SEED_ADMIN_PASSWORD");
  await replaceLegacyPassword(LEGACY_ADMIN.email, LEGACY_ADMIN.password, adminPasswordHash, "SEED_ADMIN_PASSWORD");

  // 3. Seed Verified Alumni User
  console.log(`Creating Verified Alumni user: ${alumniEmail} ...`);
  const alumniUser = await prisma.user.upsert({
    where: { email: alumniEmail },
    update: {},
    create: {
      email: alumniEmail,
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

  await replaceLegacyPassword(alumniEmail, LEGACY_ALUMNI.password, userPasswordHash, "SEED_ALUMNI_PASSWORD");
  await replaceLegacyPassword(LEGACY_ALUMNI.email, LEGACY_ALUMNI.password, userPasswordHash, "SEED_ALUMNI_PASSWORD");

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
      time: "09:00 AM - 09:00 PM",
      locationCity: "Chattogram",
      organizer: "SSGHS Alumni Association",
      description:
        "The flagship quadrennial gathering of all batches from 1985 to 2025. Featuring alumni awards, memorial tribute, cultural night, batch stalls, and feast.",
      bannerImage:
        "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1200",
      maxAttendees: 2500,
      attendeesCount: 1420,
      registrationFee: 1500,
    },
    {
      title: "SSGHS Inter-Batch Football Carnival 2026",
      slug: "inter-batch-football-carnival-2026",
      category: "SPORTS" as const,
      date: new Date("2026-12-12T08:00:00.000Z"),
      venue: "School Football Field & Sports Pavilion",
      time: "08:00 AM - 06:00 PM",
      locationCity: "Chattogram",
      organizer: "SSGHS Sports Committee",
      description:
        "32 alumni batches competing for the coveted SSGHS Champion Shield. Day-long sports carnival with live commentary and food pavilion.",
      bannerImage:
        "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200",
      maxAttendees: 500,
      attendeesCount: 340,
      registrationFee: 500,
    },
    {
      title: "Tech & Career Leadership Summit 2026",
      slug: "tech-career-leadership-summit-2026",
      category: "WEBINAR" as const,
      date: new Date("2026-10-05T14:00:00.000Z"),
      venue: "Virtual via Zoom & SSGHS Media Center",
      time: "02:00 PM - 06:00 PM",
      locationCity: "Chattogram",
      organizer: "SSGHS Tech Alumni Network",
      description:
        "Distinguished SSGHS alumni leaders in Tech, Medicine, and Civil Service share mentorship and global career roadmaps with young graduates.",
      bannerImage:
        "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1200",
      maxAttendees: 1000,
      attendeesCount: 620,
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
      goalAmount: 500000,
      raisedAmount: 385000,
      donorCount: 142,
      description:
        "Providing full annual tuition, books, and uniforms for 50 meritorious students facing economic hardships at Sabuj Shikshayatan Govt. High School.",
      bannerImage:
        "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=1000",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    },
    {
      title: "Modern STEM & Computer Science Lab Modernization",
      slug: "modern-stem-lab",
      category: "STEM_LAB" as const,
      goalAmount: 800000,
      raisedAmount: 640000,
      donorCount: 98,
      description:
        "Equipping the campus science lab with 25 modern computers, robotics kits, and high-speed internet to prepare students for the 4th Industrial Revolution.",
      bannerImage:
        "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80&w=1000",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-11-30"),
    },
    {
      title: "School Library Renovation & Digital Resources",
      slug: "library-renovation-fund",
      category: "LIBRARY" as const,
      goalAmount: 300000,
      raisedAmount: 120000,
      donorCount: 45,
      description: "Modernising the school library with digital cataloguing and 2000 new books.",
      bannerImage:
        "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=1000",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-12-31"),
    },
  ];

  for (const cp of campaigns) {
    await prisma.donationCampaign.upsert({
      where: { slug: cp.slug },
      update: {},
      create: cp,
    });
  }

  // 7. Seed Announcements. These models have no natural unique key, and the old
  // raw SQL seed wrote the same rows under random ids, so match on content
  // instead of upserting by id to avoid duplicating them.
  console.log("Seeding Announcements...");
  const announcements = [
    {
      id: "seed-announcement-reunion-2026",
      title: "Grand Alumni Reunion 2026 — Registration Open!",
      content:
        "Registration for the Grand Alumni Reunion 2026 is now officially open. Join thousands of alumni from all batches (1985–2025) for a historic gathering at our beloved school campus in Chattogram. Early bird seats are filling up fast!",
      priority: "HIGH",
    },
    {
      id: "seed-announcement-digital-card",
      title: "SSGHS Alumni Digital Card Launch",
      content:
        "We are proud to announce the launch of the SSGHS Alumni Digital ID Card system. All verified alumni can now generate their official digital membership card from the Alumni Portal dashboard.",
      priority: "NORMAL",
    },
    {
      id: "seed-announcement-scholarship-2024",
      title: "Scholarship Applications Open — Batch 2024–25",
      content:
        "The SSGHS Merit Scholarship Fund is now accepting applications for the 2024–25 academic year. Current students with financial need and strong academic performance are encouraged to apply.",
      priority: "NORMAL",
    },
  ];

  for (const a of announcements) {
    const exists = await prisma.announcement.findFirst({ where: { title: a.title } });
    if (!exists) await prisma.announcement.create({ data: a });
  }

  // 8. Seed News Articles
  console.log("Seeding News Articles...");
  const news = [
    {
      id: "seed-news-30-years",
      title: "SSGHS Alumni Association Celebrates 30 Years of Community Excellence",
      category: "School News",
      excerpt: "The SSGHS Alumni Association marks three decades of connecting graduates and giving back to the school.",
      content:
        "The Sabuj Shikshayatan Government High School Alumni Association celebrated its 30th founding anniversary with a grand ceremony attended by over 500 alumni from across Bangladesh and abroad.",
      featuredImage: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1000",
      author: "Alumni Editorial Board",
      isFeatured: true,
    },
    {
      id: "seed-news-2008-computer-lab",
      title: "Class of 2008 Alumni Donates State-of-the-Art Computer Lab",
      category: "Alumni News",
      excerpt: "Batch 2008 alumni collectively fund a fully-equipped computer laboratory for current students.",
      content:
        "In a remarkable display of community spirit, the SSGHS Class of 2008 alumni collectively raised BDT 12 lakh to establish a 30-station computer laboratory equipped with the latest hardware and high-speed internet connectivity.",
      featuredImage: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80&w=1000",
      author: "News Desk",
      isFeatured: false,
    },
    {
      id: "seed-news-dr-rahman",
      title: "Batch 1995 Alumnus Dr. Rahman Appointed Deputy Health Secretary",
      category: "Alumni News",
      excerpt: "SSGHS batch 1995 alumnus rises to a senior position in the national health ministry.",
      content:
        "The SSGHS alumni community takes great pride in congratulating Dr. Tariqul Rahman (Batch 1995) on his appointment as Deputy Secretary at the Ministry of Health and Family Welfare, Government of Bangladesh.",
      featuredImage: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1000",
      author: "Alumni Editorial Board",
      isFeatured: false,
    },
  ];

  for (const n of news) {
    const exists = await prisma.newsArticle.findFirst({ where: { title: n.title } });
    if (!exists) await prisma.newsArticle.create({ data: n });
  }

  // 9. Seed Community Posts
  console.log("Seeding Community Posts...");
  const posts = [
    {
      id: "seed-post-campus-visit",
      authorId: alumniUser.id,
      batchTag: 2008,
      content:
        "Had the privilege of visiting our beloved Sabuj Shikshayatan campus yesterday! Walked through the old classrooms on the 2nd floor.",
      likesCount: 25,
      commentsCount: 4,
      isPinned: true,
    },
    {
      id: "seed-post-health-camp",
      authorId: adminUser.id,
      batchTag: 2006,
      content:
        "Free Cardiac and General Health Screening Camp on October 10th at the school auditorium, dedicated to our current and retired teachers.",
      likesCount: 42,
      commentsCount: 8,
      isPinned: false,
    },
    {
      id: "seed-post-startup-award",
      authorId: alumniUser.id,
      batchTag: 2011,
      content:
        "Proud to share that our startup has been nominated for the National Sustainable Enterprise Award! None of this would have been possible without SSGHS!",
      likesCount: 18,
      commentsCount: 3,
      isPinned: false,
    },
  ];

  for (const p of posts) {
    // Match the fixed id too: if a seed email changed, the post already exists under the old author.
    const exists = await prisma.post.findFirst({
      where: { OR: [{ id: p.id }, { authorId: p.authorId, content: p.content }] },
    });
    if (!exists) await prisma.post.create({ data: p });
  }

  console.log("✅ SSGHS Alumni database seeded successfully!");
  console.log("--------------------------------------------------");
  console.log(`Pre-seeded Admin User: ${adminEmail} (password from SEED_ADMIN_PASSWORD)`);
  console.log(`Pre-seeded Alumni User: ${alumniEmail} (password from SEED_ALUMNI_PASSWORD)`);
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
