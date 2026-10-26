import { prisma } from "../lib/prisma";
import { removeDocument, saveDocument } from "../lib/media/documents";

/**
 * Sample association content for trying the site (npm run db:seed:association-demo):
 * a current committee, three past terms, the President's message, notices, the honor
 * board and a sample constitution PDF. Every name is made up and no phone number or
 * Facebook link is set. Rows use "seed-" ids so npm run db:remove-demo deletes them;
 * replace them with the real ones in the admin panel before launch.
 */

const SEED = "seed-assoc-";
const MESSAGE_KEY = "president-message";

export const DEMO_PRESIDENT_MESSAGE = [
  "প্রিয় প্রাক্তন সবুজিয়ান ভাই ও বোনেরা, প্রাক্তন সবুজিয়ান পরিষদের পক্ষ থেকে সবাইকে আন্তরিক শুভেচ্ছা। সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয় আমাদের সবার প্রথম ঠিকানা; এখানেই আমাদের বন্ধুত্ব, স্বপ্ন আর জীবনের ভিত্তি গড়ে উঠেছে।",
  "On behalf of the executive committee, welcome to our online home. Our aim is simple: to keep every batch connected with each other and with the school, to support students who need help, and to honour the teachers who shaped us.",
  "This year the school completes fifty years. Join the Golden Jubilee, find your batchmates in the directory, and share your time and ideas with the association. Together we can make the next fifty years even brighter.",
].join("\n\n");

type Member = { name: string; post: string; lm?: string; batch?: number; note?: string };

const TERMS: { id: string; title: string; startYear: number; endYear: number | null; isCurrent: boolean; members: Member[] }[] = [
  {
    id: `${SEED}term-2025`,
    title: "Executive Committee 2025–2027",
    startYear: 2025,
    endYear: 2027,
    isCurrent: true,
    members: [
      { name: "Mohammad Abdul Karim", post: "President", lm: "012", batch: 1982 },
      { name: "Nurul Amin Chowdhury", post: "Vice-President", lm: "027", batch: 1985 },
      { name: "Shahana Parvin", post: "Vice-President", lm: "041", batch: 1988 },
      { name: "Md. Rafiqul Islam", post: "General Secretary", lm: "058", batch: 1994 },
      { name: "Tanvir Ahmed", post: "Joint Secretary", lm: "103", batch: 2001 },
      { name: "Kamrul Hasan", post: "Organizing Secretary", lm: "117", batch: 2003 },
      { name: "Farzana Akter", post: "Finance Secretary", lm: "126", batch: 2004 },
      { name: "Sabbir Hossain", post: "Cultural Secretary", lm: "142", batch: 2008 },
      { name: "Nusrat Jahan", post: "Welfare Secretary", lm: "155", batch: 2010 },
      { name: "Imran Hossain", post: "Office Secretary", lm: "168", batch: 2012 },
      { name: "Abu Taher", post: "Member", lm: "074", batch: 1990 },
      { name: "Rumana Afroz", post: "Member", lm: "181", batch: 2014 },
      { name: "Mahmudul Hasan", post: "Member", lm: "196", batch: 2017 },
      { name: "Head Teacher", post: "Member", note: "Head teacher, Sabuj Shikshayatan Govt. High School (ex officio)" },
    ],
  },
  {
    id: `${SEED}term-2022`,
    title: "Executive Committee 2022–2024",
    startYear: 2022,
    endYear: 2024,
    isCurrent: false,
    members: [
      { name: "Abdul Hamid", post: "President", batch: 1980 },
      { name: "Mohammad Abdul Karim", post: "Vice-President", batch: 1982 },
      { name: "Shamim Reza", post: "General Secretary", batch: 1992 },
      { name: "Farzana Akter", post: "Finance Secretary", batch: 2004 },
      { name: "Md. Rafiqul Islam", post: "Organizing Secretary", batch: 1994 },
    ],
  },
  {
    id: `${SEED}term-2018`,
    title: "Executive Committee 2018–2021",
    startYear: 2018,
    endYear: 2021,
    isCurrent: false,
    members: [
      { name: "Syed Mostafa Kamal", post: "President", batch: 1978 },
      { name: "Abdul Hamid", post: "Vice-President", batch: 1980 },
      { name: "Shamim Reza", post: "General Secretary", batch: 1992 },
      { name: "Jahangir Alam", post: "Finance Secretary", batch: 1989 },
    ],
  },
  {
    id: `${SEED}term-2015`,
    title: "Founding Committee 2015–2017",
    startYear: 2015,
    endYear: 2017,
    isCurrent: false,
    members: [
      { name: "Syed Mostafa Kamal", post: "Convener", batch: 1978 },
      { name: "Jahangir Alam", post: "Member Secretary", batch: 1989 },
      { name: "Abdul Hamid", post: "Member", batch: 1980 },
      { name: "Nurul Amin Chowdhury", post: "Member", batch: 1985 },
    ],
  },
];

const HONOR: { honour: string; name: string; period?: string; batch?: number; note?: string }[] = [
  { honour: "Founding members", name: "Syed Mostafa Kamal", batch: 1978, note: "Convener of the founding committee" },
  { honour: "Founding members", name: "Jahangir Alam", batch: 1989, note: "Member secretary of the founding committee" },
  { honour: "Founding members", name: "Abdul Hamid", batch: 1980 },
  { honour: "Past presidents", name: "Syed Mostafa Kamal", period: "2015–2021", batch: 1978 },
  { honour: "Past presidents", name: "Abdul Hamid", period: "2022–2024", batch: 1980 },
  { honour: "Past general secretaries", name: "Jahangir Alam", period: "2015–2017", batch: 1989 },
  { honour: "Past general secretaries", name: "Shamim Reza", period: "2018–2024", batch: 1992 },
];

const NOTICES: { id: string; title: string; content: string; priority: string; daysAgo: number }[] = [
  {
    id: `${SEED}notice-jubilee`,
    title: "সুবর্ণ জয়ন্তী ২০২৬: রেজিস্ট্রেশনের শেষ সময় ৩০ নভেম্বর",
    content:
      "সুবর্ণ জয়ন্তী ২০২৬-এর রেজিস্ট্রেশন চলছে। ৩০ নভেম্বর ২০২৬-এর মধ্যে ওয়েবসাইটে অথবা কমিটির সদস্যের কাছে কাগজের ফর্মে রেজিস্ট্রেশন সম্পন্ন করুন।\n\nGolden Jubilee 2026 registration is open until 30 November 2026. Register on this website or on the paper form with a committee member.",
    priority: "HIGH",
    daysAgo: 1,
  },
  {
    id: `${SEED}notice-agm`,
    title: "বার্ষিক সাধারণ সভা (AGM) এর নোটিশ",
    content:
      "পরিষদের বার্ষিক সাধারণ সভা বিদ্যালয় প্রাঙ্গণে অনুষ্ঠিত হবে। তারিখ ও সময় শীঘ্রই জানানো হবে। সকল সদস্যকে উপস্থিত থাকার অনুরোধ করা হলো।\n\nThe annual general meeting will be held on the school campus. The date and time will be announced soon; all members are requested to attend.",
    priority: "NORMAL",
    daysAgo: 6,
  },
  {
    id: `${SEED}notice-volunteers`,
    title: "Volunteers wanted for the Golden Jubilee",
    content:
      "We need volunteers for registration desks, food counters, the stage and guest care during the Golden Jubilee. Sign up on the Volunteer page and the organizing committee will contact you.",
    priority: "NORMAL",
    daysAgo: 12,
  },
];

/** A one-page PDF saying it is a sample, so the constitution page has something to download. */
function samplePdf(title: string): Buffer {
  const text = (s: string) => s.replace(/[\\()]/g, "\\$&");
  const stream = [
    "BT /F1 20 Tf 72 720 Td (" + text(title) + ") Tj ET",
    "BT /F1 12 Tf 72 690 Td (Praktan Sabujian Parishad - Sabuj Shikshayatan Govt. High School) Tj ET",
    "BT /F1 12 Tf 72 660 Td (Sample document for trying the website. Replace it with the real) Tj ET",
    "BT /F1 12 Tf 72 644 Td (constitution in Admin > Constitution.) Tj ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

/**
 * Writes the sample content; safe to re-run (rows are replaced, not duplicated). Real
 * content is never touched: a real current committee stays current, and an existing
 * President's message is kept.
 */
export async function seedAssociationDemo(now = new Date()): Promise<Record<string, number>> {
  const realCurrent = await prisma.committeeTerm.count({ where: { isCurrent: true, id: { not: { startsWith: SEED } } } });
  let members = 0;
  for (const t of TERMS) {
    const data = { title: t.title, startYear: t.startYear, endYear: t.endYear, isCurrent: t.isCurrent && realCurrent === 0, imageUrl: null };
    await prisma.committeeTerm.upsert({ where: { id: t.id }, create: { id: t.id, ...data }, update: data });
    await prisma.committeeMember.deleteMany({ where: { termId: t.id } });
    await prisma.committeeMember.createMany({
      data: t.members.map((m, i) => ({
        id: `${t.id}-m${i + 1}`,
        termId: t.id,
        name: m.name,
        post: m.post,
        lifeMemberNo: m.lm ?? null,
        sscBatch: m.batch ?? null,
        note: m.note ?? null,
        sortOrder: i + 1,
      })),
    });
    members += t.members.length;
  }

  await prisma.honorBoardEntry.deleteMany({ where: { id: { startsWith: SEED } } });
  await prisma.honorBoardEntry.createMany({
    data: HONOR.map((h, i) => ({ id: `${SEED}honor-${i + 1}`, honour: h.honour, name: h.name, period: h.period ?? null, sscBatch: h.batch ?? null, note: h.note ?? null, sortOrder: i + 1 })),
  });

  for (const n of NOTICES) {
    const data = {
      title: n.title,
      content: n.content,
      priority: n.priority,
      author: "Praktan Sabujian Parishad",
      isActive: true,
      publishedAt: new Date(now.getTime() - n.daysAgo * 86_400_000),
    };
    await prisma.announcement.upsert({ where: { id: n.id }, create: { id: n.id, ...data }, update: data });
  }

  // One sample constitution with its PDF; a re-run keeps the file it already has.
  const docId = `${SEED}constitution-2015`;
  if (!(await prisma.constitutionDocument.findUnique({ where: { id: docId } }))) {
    const { url } = await saveDocument(samplePdf("Constitution (sample)"));
    await prisma.constitutionDocument.create({
      data: { id: docId, title: "Constitution of Praktan Sabujian Parishad (sample)", year: 2015, summary: "Sample document: replace it with the real constitution.", fileUrl: url },
    });
  }

  const message = await prisma.setting.findUnique({ where: { key: MESSAGE_KEY } });
  let presidentMessage = 0;
  let hasMessage = false;
  try {
    hasMessage = Boolean(message && JSON.parse(message.value).message);
  } catch {
    // A damaged value counts as no message.
  }
  if (!hasMessage) {
    const value = JSON.stringify({ message: DEMO_PRESIDENT_MESSAGE });
    await prisma.setting.upsert({ where: { key: MESSAGE_KEY }, create: { key: MESSAGE_KEY, value, updatedBy: "demo seed" }, update: { value, updatedBy: "demo seed" } });
    presidentMessage = 1;
  }

  return { committeeTerms: TERMS.length, committeeMembers: members, honorBoard: HONOR.length, notices: NOTICES.length, constitution: 1, presidentMessage };
}

/** Removes the sample content (and the sample PDF); the President's message only if it is still the sample one. */
export async function removeAssociationDemo(): Promise<Record<string, number>> {
  const seeded = { id: { startsWith: SEED } };
  const docs = await prisma.constitutionDocument.findMany({ where: seeded, select: { fileUrl: true } });
  for (const d of docs) await removeDocument(d.fileUrl);
  const message = await prisma.setting.findUnique({ where: { key: MESSAGE_KEY } });
  let presidentMessage = 0;
  if (message && message.updatedBy === "demo seed") {
    await prisma.setting.delete({ where: { key: MESSAGE_KEY } });
    presidentMessage = 1;
  }
  return {
    committeeTerms: (await prisma.committeeTerm.deleteMany({ where: seeded })).count,
    honorBoard: (await prisma.honorBoardEntry.deleteMany({ where: seeded })).count,
    constitution: (await prisma.constitutionDocument.deleteMany({ where: seeded })).count,
    presidentMessage,
  };
}

/** How many sample rows are left, for the production seed's leftovers report. */
export async function countAssociationDemo(): Promise<number> {
  const seeded = { id: { startsWith: SEED } };
  return (
    (await prisma.committeeTerm.count({ where: seeded })) +
    (await prisma.honorBoardEntry.count({ where: seeded })) +
    (await prisma.constitutionDocument.count({ where: seeded }))
  );
}
