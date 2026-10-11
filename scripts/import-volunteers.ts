import "../lib/load-env";
import fs from "node:fs/promises";
import path from "node:path";

// One-time move of volunteer applications from the old uploads/volunteers.json
// store into the Volunteer table. The five made-up sample volunteers (vol-1 to
// vol-5) are skipped. Safe to run again: entries already imported are skipped.
const SAMPLE_IDS = new Set(["vol-1", "vol-2", "vol-3", "vol-4", "vol-5"]);

type OldVolunteer = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  sscBatch: number;
  subcommittee: string;
  skills?: string;
  availability?: string;
  experience?: string;
  notes?: string;
  source?: string;
  status?: string;
  appliedAt?: string;
};

async function main() {
  const { default: prisma } = await import("../lib/prisma");
  const file = path.join(process.cwd(), "uploads", "volunteers.json");
  let items: OldVolunteer[];
  try {
    items = JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    console.log(`No ${file}; nothing to import.`);
    process.exit(0);
  }

  let imported = 0;
  let skipped = 0;
  for (const v of items) {
    if (SAMPLE_IDS.has(v.id) || (await prisma.volunteer.findUnique({ where: { id: v.id }, select: { id: true } }))) {
      skipped += 1;
      continue;
    }
    await prisma.volunteer.create({
      data: {
        id: v.id,
        fullName: v.fullName.slice(0, 120),
        email: v.email.trim().toLowerCase().slice(0, 254),
        phone: v.phone.slice(0, 30),
        sscBatch: Number(v.sscBatch) || 0,
        subcommittee: v.subcommittee.slice(0, 40),
        skills: v.skills ?? null,
        availability: v.availability?.slice(0, 200) ?? null,
        experience: v.experience ?? null,
        notes: v.notes ?? null,
        source: v.source === "EVENT_REGISTRATION" ? "EVENT_REGISTRATION" : "PUBLIC_APPLICATION",
        status: ["PENDING", "APPROVED", "DECLINED"].includes(v.status ?? "") ? v.status! : "PENDING",
        appliedAt: v.appliedAt ? new Date(v.appliedAt) : new Date(),
      },
    });
    imported += 1;
  }
  console.log(`Imported ${imported} volunteer application(s); skipped ${skipped} (samples or already imported).`);
  if (imported > 0 || skipped === items.length) {
    console.log(`You can now delete ${file}; the app no longer reads it.`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
