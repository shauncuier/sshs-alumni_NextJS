import fs from "node:fs/promises";
import path from "node:path";
import type { VolunteerItem } from "./volunteers-types";
import { SUBCOMMITTEES, SUBCOMMITTEE_LABELS } from "./volunteers-types";

export type { VolunteerItem };
export { SUBCOMMITTEES, SUBCOMMITTEE_LABELS };

const INITIAL_VOLUNTEERS: VolunteerItem[] = [
  {
    id: "vol-1",
    fullName: "Dr. Nusrat Jahan",
    email: "nusrat.jahan@cmch.gov.bd",
    phone: "+880 1711-234567",
    sscBatch: 2005,
    subcommittee: "MEDICAL_FIRSTAID",
    subcommitteeLabel: "Alumni Medical Wing & First Aid",
    skills: "MBBS, FCPS Cardiology, Emergency First Aid & CPR Trainer",
    availability: "Dec 30 - 31 (All Days)",
    experience: "Led medical response tent during Batch 2005 10-year reunion",
    notes: "Can bring a team of 4 alumni trainee doctors and emergency kits",
    source: "PUBLIC_APPLICATION",
    status: "APPROVED",
    appliedAt: "2026-09-28T14:20:00.000Z",
  },
  {
    id: "vol-2",
    fullName: "Tanvir Ahmed",
    email: "tanvir.ahmed@mofa.gov.bd",
    phone: "+880 1819-345678",
    sscBatch: 2008,
    subcommittee: "RECEPTION_VIP",
    subcommitteeLabel: "Reception & VIP Protocol",
    skills: "BCS Foreign Affairs, Diplomatic Protocol & Stage Moderation",
    availability: "Dec 30 (Full Day)",
    experience: "Chief Coordinator for Inter-College Debate Festival 2012",
    notes: "Will coordinate VIP lounge and protocol for cabinet guests",
    source: "PUBLIC_APPLICATION",
    status: "APPROVED",
    appliedAt: "2026-09-29T10:15:00.000Z",
  },
  {
    id: "vol-3",
    fullName: "Farhana Chowdhury",
    email: "farhana.cse@gmail.com",
    phone: "+880 1912-456789",
    sscBatch: 2018,
    subcommittee: "GATE_SECURITY",
    subcommitteeLabel: "Gate Entry & Security QR Scanning",
    skills: "Mobile App Testing, QR Code Scanning Systems, Fast Typist",
    availability: "Dec 30 - 31 (Morning Shifts)",
    experience: "Campus volunteer for Sitakunda Youth Festival 2024",
    notes: "Experienced using the SSGHS gate scanner app on Android",
    source: "EVENT_REGISTRATION",
    status: "PENDING",
    appliedAt: "2026-09-30T16:45:00.000Z",
  },
  {
    id: "vol-4",
    fullName: "Mahmudul Hasan",
    email: "mahmud.buet@gmail.com",
    phone: "+880 1715-678901",
    sscBatch: 2014,
    subcommittee: "MEZBAN_FOOD",
    subcommitteeLabel: "Mezban Feast & Food Distribution",
    skills: "Logistics Management, Supply Chain Coordination",
    availability: "Dec 31 (Mezban Day, 10 AM - 5 PM)",
    experience: "Managed community relief kitchen and batch iftar feasts",
    notes: "Ready to coordinate dining lines for Batches 2010 through 2020",
    source: "PUBLIC_APPLICATION",
    status: "PENDING",
    appliedAt: "2026-10-01T08:30:00.000Z",
  },
  {
    id: "vol-5",
    fullName: "Saiful Islam Rony",
    email: "saiful.rony22@gmail.com",
    phone: "+880 1823-789012",
    sscBatch: 2022,
    subcommittee: "CULTURAL_STAGE",
    subcommitteeLabel: "Cultural Program & Stage Logistics",
    skills: "Sound Engineering, Audio Mixer Setup, Guitarist",
    availability: "Dec 31 (Evening & Concert)",
    experience: "Student Council Cultural Secretary 2021-2022",
    notes: "Willing to assist bands (Warfaze & Shironamhin) with backstage equipment",
    source: "EVENT_REGISTRATION",
    status: "PENDING",
    appliedAt: "2026-10-01T19:10:00.000Z",
  },
];

const STORE_PATH = path.join(process.cwd(), "uploads", "volunteers.json");

async function loadStore(): Promise<VolunteerItem[]> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data) && data.length > 0) return data;
  } catch {
    // If not on disk yet, initialize with defaults
    await saveStore(INITIAL_VOLUNTEERS).catch(() => {});
  }
  return INITIAL_VOLUNTEERS;
}

async function saveStore(items: VolunteerItem[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(items, null, 2), "utf8");
  } catch (err) {
    console.warn("[Volunteers Store] Could not write to disk:", err);
  }
}

export async function getVolunteers(filterStatus?: string): Promise<VolunteerItem[]> {
  const all = await loadStore();
  if (!filterStatus || filterStatus === "ALL") return all;
  return all.filter((v) => v.status === filterStatus);
}

export async function createVolunteer(input: {
  fullName: string;
  email: string;
  phone: string;
  sscBatch: number;
  subcommittee: string;
  skills?: string;
  availability?: string;
  experience?: string;
  notes?: string;
  source?: "PUBLIC_APPLICATION" | "EVENT_REGISTRATION";
}): Promise<VolunteerItem> {
  const all = await loadStore();
  const label =
    SUBCOMMITTEE_LABELS[input.subcommittee] ||
    SUBCOMMITTEES.find((s) => s.name === input.subcommittee)?.name ||
    input.subcommittee;

  const item: VolunteerItem = {
    id: `vol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    sscBatch: input.sscBatch,
    subcommittee: input.subcommittee,
    subcommitteeLabel: label,
    skills: input.skills?.trim(),
    availability: input.availability?.trim() || "Anytime needed",
    experience: input.experience?.trim(),
    notes: input.notes?.trim(),
    source: input.source || "PUBLIC_APPLICATION",
    status: "PENDING",
    appliedAt: new Date().toISOString(),
  };

  all.unshift(item);
  await saveStore(all);
  return item;
}

export async function updateVolunteerStatus(
  id: string,
  status: "APPROVED" | "DECLINED" | "PENDING",
  subcommittee?: string
): Promise<VolunteerItem | null> {
  const all = await loadStore();
  const target = all.find((v) => v.id === id);
  if (!target) return null;

  target.status = status;
  if (subcommittee) {
    target.subcommittee = subcommittee;
    target.subcommitteeLabel = SUBCOMMITTEE_LABELS[subcommittee] || subcommittee;
  }

  await saveStore(all);
  return target;
}
