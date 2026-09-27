// scripts/seed.js — Direct MySQL seed (no Prisma CLI needed)
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env" });

const DB_URL = process.env.DATABASE_URL;

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function seed() {
  const conn = await mysql.createConnection(DB_URL);
  console.log("🌱 Seeding SSGHS Alumni database...\n");

  const adminHash = await bcrypt.hash("admin123", 10);
  const userHash  = await bcrypt.hash("password123", 10);
  const adminId   = uuid();
  const alumniId  = uuid();

  // ── Users ──────────────────────────────────────────────
  await conn.execute(
    `INSERT IGNORE INTO \`User\` (id, email, passwordHash, role, status) VALUES (?,?,?,'ADMIN','VERIFIED')`,
    [adminId, "admin@sabujsghs.edu.bd", adminHash]
  );
  await conn.execute(
    `INSERT IGNORE INTO \`User\` (id, email, passwordHash, role, status) VALUES (?,?,?,'ALUMNI','VERIFIED')`,
    [alumniId, "jashedul@example.com", userHash]
  );
  console.log("  ✅ Users seeded (admin + alumni)");

  // ── Profiles ───────────────────────────────────────────
  await conn.execute(
    `INSERT IGNORE INTO \`AlumniProfile\` (id, userId, fullName, sscBatch, graduationYear, profession, company, locationCity, locationCountry, bio, avatarUrl, verificationStatus) VALUES (?,?,?,?,?,?,?,?,?,?,?,'VERIFIED')`,
    [uuid(), adminId, "SSGHS Executive Council Secretariat", 1995, 1995, "Association General Secretary", "Sabuj Shikshayatan Govt. High School", "Chattogram", "Bangladesh", "Official administrative management.", "/logo.png"]
  );
  await conn.execute(
    `INSERT IGNORE INTO \`AlumniProfile\` (id, userId, fullName, sscBatch, graduationYear, profession, company, industry, locationCity, locationCountry, rollNumber, section, bio, verificationStatus, skills) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'VERIFIED','["Next.js","TypeScript","Cloud Infrastructure"]')`,
    [uuid(), alumniId, "Md. Jashedul Hoque", 2008, 2008, "Senior Software Engineer", "Databricks / Cloud Systems", "Information Technology", "Dhaka", "Bangladesh", "101", "A", "SSGHS Batch 2008 alumnus passionate about software architecture."]
  );
  console.log("  ✅ Profiles seeded");

  // ── Batches ────────────────────────────────────────────
  const batchYears = Array.from({ length: 41 }, (_, i) => 1985 + i);
  for (const year of batchYears) {
    await conn.execute(
      `INSERT IGNORE INTO \`Batch\` (id, year, name, tagline, totalMembers, reunionCount) VALUES (?,?,?,?,?,?)`,
      [uuid(), year, `SSC Batch ${year}`, `Proud alumni of SSGHS Class of ${year}`,
       Math.floor(Math.random() * 80) + 40, year < 2015 ? Math.floor(Math.random() * 5) + 1 : 0]
    );
  }
  console.log("  ✅ Batches seeded (1985–2025)");

  // ── Events ─────────────────────────────────────────────
  const events = [
    [uuid(), "grand-alumni-reunion-2026", "Grand Alumni Reunion 2026: 40 Years of Excellence", "REUNION",
     "The flagship quadrennial gathering of all batches from 1985 to 2025.",
     new Date("2026-11-20"), "09:00 AM - 09:00 PM", "Main Campus Auditorium & Grounds, SSGHS, Chattogram", "Chattogram",
     "SSGHS Alumni Association", "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1200",
     2500, 1420, 1500],
    [uuid(), "inter-batch-football-carnival-2026", "SSGHS Inter-Batch Football Carnival 2026", "SPORTS",
     "32 alumni batches competing for the coveted SSGHS Champion Shield.",
     new Date("2026-12-12"), "08:00 AM - 06:00 PM", "School Football Field & Sports Pavilion", "Chattogram",
     "SSGHS Sports Committee", "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200",
     500, 340, 500],
    [uuid(), "tech-career-leadership-summit-2026", "Tech & Career Leadership Summit 2026", "WEBINAR",
     "Distinguished SSGHS alumni leaders share mentorship and global career roadmaps.",
     new Date("2026-10-05"), "02:00 PM - 06:00 PM", "Virtual via Zoom & SSGHS Media Center", "Chattogram",
     "SSGHS Tech Alumni Network", "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1200",
     1000, 620, 0],
  ];
  for (const [id, slug, title, category, description, date, time, venue, city, organizer, banner, totalSeats, confirmedSeats, fee] of events) {
    await conn.execute(
      `INSERT IGNORE INTO \`Event\` (id, slug, title, category, description, date, time, venue, locationCity, organizer, bannerUrl, totalSeats, confirmedSeats, registrationFee) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, slug, title, category, description, date, time, venue, city, organizer, banner, totalSeats, confirmedSeats, fee]
    );
  }
  console.log("  ✅ Events seeded (3 events)");

  // ── Donation Campaigns ─────────────────────────────────
  const campaigns = [
    [uuid(), "student-merit-scholarship", "Needy Student Merit Scholarship Endowment", "SCHOLARSHIP",
     "Providing full annual tuition, books, and uniforms for 50 meritorious students.",
     500000, 385000, 142, "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=1000",
     new Date("2026-01-01"), new Date("2026-12-31")],
    [uuid(), "modern-stem-lab", "Modern STEM & Computer Science Lab", "STEM_LAB",
     "Equipping the campus science lab with 25 modern computers, robotics kits, and high-speed internet.",
     800000, 640000, 98, "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80&w=1000",
     new Date("2026-02-01"), new Date("2026-11-30")],
    [uuid(), "library-renovation-fund", "School Library Renovation & Digital Resources", "LIBRARY",
     "Modernising the school library with digital cataloguing and 2000 new books.",
     300000, 120000, 45, "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=1000",
     new Date("2026-03-01"), new Date("2026-12-31")],
  ];
  for (const [id, slug, title, category, description, target, raised, donors, image, start, end] of campaigns) {
    await conn.execute(
      `INSERT IGNORE INTO \`DonationCampaign\` (id, slug, title, category, description, targetAmount, goalAmount, raisedAmount, donorCount, imageUrl, startDate, endDate) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, slug, title, category, description, target, target, raised, donors, image, start, end]
    );
  }
  console.log("  ✅ Donation campaigns seeded (3 campaigns)");

  // ── Announcements ──────────────────────────────────────
  const announcements = [
    [uuid(), "Grand Alumni Reunion 2026 — Registration Open!", "Registration for the Grand Alumni Reunion 2026 is now officially open. Join thousands of alumni from all batches (1985–2025) for a historic gathering at our beloved school campus in Chattogram. Early bird seats are filling up fast!", "HIGH"],
    [uuid(), "SSGHS Alumni Digital Card Launch", "We are proud to announce the launch of the SSGHS Alumni Digital ID Card system. All verified alumni can now generate their official digital membership card from the Alumni Portal dashboard.", "NORMAL"],
    [uuid(), "Scholarship Applications Open — Batch 2024–25", "The SSGHS Merit Scholarship Fund is now accepting applications for the 2024–25 academic year. Current students with financial need and strong academic performance are encouraged to apply.", "NORMAL"],
  ];
  for (const [id, title, content, priority] of announcements) {
    await conn.execute(
      `INSERT IGNORE INTO \`Announcement\` (id, title, content, priority) VALUES (?,?,?,?)`,
      [id, title, content, priority]
    );
  }
  console.log("  ✅ Announcements seeded");

  // ── News Articles ──────────────────────────────────────
  const news = [
    [uuid(), "SSGHS Alumni Association Celebrates 30 Years of Community Excellence", "School News",
     "The SSGHS Alumni Association marks three decades of connecting graduates and giving back to the school.",
     "The Sabuj Shikshayatan Government High School Alumni Association celebrated its 30th founding anniversary with a grand ceremony attended by over 500 alumni from across Bangladesh and abroad.",
     "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1000",
     "Alumni Editorial Board", true],
    [uuid(), "Class of 2008 Alumni Donates State-of-the-Art Computer Lab", "Alumni News",
     "Batch 2008 alumni collectively fund a fully-equipped computer laboratory for current students.",
     "In a remarkable display of community spirit, the SSGHS Class of 2008 alumni collectively raised BDT 12 lakh to establish a 30-station computer laboratory equipped with the latest hardware and high-speed internet connectivity.",
     "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80&w=1000",
     "News Desk", false],
    [uuid(), "Batch 1995 Alumnus Dr. Rahman Appointed Deputy Health Secretary", "Alumni News",
     "SSGHS batch 1995 alumnus rises to a senior position in the national health ministry.",
     "The SSGHS alumni community takes great pride in congratulating Dr. Tariqul Rahman (Batch 1995) on his appointment as Deputy Secretary at the Ministry of Health and Family Welfare, Government of Bangladesh.",
     "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1000",
     "Alumni Editorial Board", false],
  ];
  for (const [id, title, category, excerpt, content, featuredImage, author, isFeatured] of news) {
    await conn.execute(
      `INSERT IGNORE INTO \`NewsArticle\` (id, title, category, excerpt, content, featuredImage, author, isFeatured) VALUES (?,?,?,?,?,?,?,?)`,
      [id, title, category, excerpt, content, featuredImage, author, isFeatured ? 1 : 0]
    );
  }
  // ── Posts ──────────────────────────────────────────────
  const posts = [
    [uuid(), alumniId, 2008, "Had the privilege of visiting our beloved Sabuj Shikshayatan campus yesterday! Walked through the old classrooms on the 2nd floor.", "[]", 25, 4, 1],
    [uuid(), adminId, 2006, "Free Cardiac and General Health Screening Camp on October 10th at the school auditorium, dedicated to our current and retired teachers.", "[]", 42, 8, 0],
    [uuid(), alumniId, 2011, "Proud to share that our startup has been nominated for the National Sustainable Enterprise Award! None of this would have been possible without SSGHS!", "[]", 18, 3, 0],
  ];
  for (const [id, authorId, batchTag, content, images, likesCount, commentsCount, isPinned] of posts) {
    await conn.execute(
      `INSERT IGNORE INTO \`Post\` (id, authorId, batchTag, content, images, likesCount, commentsCount, isPinned, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())`,
      [id, authorId, batchTag, content, images, likesCount, commentsCount, isPinned]
    );
  }
  console.log("  ✅ Community posts seeded (3 posts)");

  await conn.end();
  console.log("\n✅ Database seeded successfully!");
  console.log("─────────────────────────────────────────");
  console.log("Admin login:  admin@sabujsghs.edu.bd / admin123");
  console.log("Alumni login: jashedul@example.com / password123");
  console.log("─────────────────────────────────────────");
}

seed().catch(e => { console.error("❌ Seed failed:", e.message); process.exit(1); });
