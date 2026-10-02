import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { prisma } from "../lib/prisma";
import { uploadsRoot } from "../lib/media/avatars";

async function generateProofs() {
  console.log("Generating authentic certificate images on disk for pending verification requests...");
  const proofsDir = path.join(uploadsRoot(), "proofs");
  await fs.mkdir(proofsDir, { recursive: true });

  const pendingRequests = await prisma.verificationRequest.findMany({
    where: { status: "PENDING" },
    include: { user: { include: { profile: true } } },
  });

  for (const req of pendingRequests) {
    const id = crypto.randomBytes(16).toString("hex");
    const targetDir = path.join(proofsDir, id);
    await fs.mkdir(targetDir, { recursive: true });

    const fullName = req.user.profile?.fullName || "Candidate";
    const batch = req.sscBatch || 2010;
    const roll = req.rollNumber || "101";

    const svg = `
      <svg width="1000" height="700" xmlns="http://www.w3.org/2000/svg">
        <rect width="1000" height="700" fill="#fdfcf7" stroke="#064e3b" stroke-width="12" />
        <rect x="25" y="25" width="950" height="650" fill="none" stroke="#d97706" stroke-width="3" />
        
        <text x="500" y="90" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#064e3b" text-anchor="middle">
          BOARD OF INTERMEDIATE AND SECONDARY EDUCATION
        </text>
        <text x="500" y="125" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="#064e3b" text-anchor="middle">
          CHATTOGRAM, BANGLADESH
        </text>

        <text x="500" y="180" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#b45309" text-anchor="middle" letter-spacing="2">
          SECONDARY SCHOOL CERTIFICATE EXAMINATION
        </text>

        <text x="500" y="240" font-family="Georgia, serif" font-size="16" fill="#374151" text-anchor="middle">
          This is to certify that
        </text>
        <text x="500" y="280" font-family="Georgia, serif" font-size="26" font-weight="bold" fill="#111827" text-anchor="middle">
          ${fullName.toUpperCase()}
        </text>

        <text x="500" y="325" font-family="Georgia, serif" font-size="16" fill="#374151" text-anchor="middle">
          Son / Daughter of Md. Anisur Rahman &amp; Jahanara Begum
        </text>

        <text x="500" y="365" font-family="Georgia, serif" font-size="16" fill="#374151" text-anchor="middle">
          bearing Roll No. <tspan font-weight="bold">${roll}</tspan>, Registration No. <tspan font-weight="bold">5892${batch.toString().slice(-2)}</tspan>
        </text>

        <text x="500" y="415" font-family="Georgia, serif" font-size="18" fill="#374151" text-anchor="middle">
          duly passed from
        </text>
        <text x="500" y="450" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="#064e3b" text-anchor="middle">
          Sabuj Shikshayatan Govt. High School
        </text>
        <text x="500" y="480" font-family="Arial, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">
          South Sonaichhari, Sitakunda, Chattogram (EIIN: 105070)
        </text>

        <text x="500" y="530" font-family="Georgia, serif" font-size="18" fill="#374151" text-anchor="middle">
          in <tspan font-weight="bold">Science</tspan> group at the Examination of <tspan font-weight="bold" fill="#064e3b">${batch}</tspan>
        </text>
        <text x="500" y="565" font-family="Georgia, serif" font-size="18" font-weight="bold" fill="#15803d" text-anchor="middle">
          and secured GPA 5.00 on a scale of 5.00
        </text>

        <!-- Signatures & Seals -->
        <line x1="120" y1="630" x2="320" y2="630" stroke="#4b5563" stroke-width="1.5" />
        <text x="220" y="650" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#4b5563" text-anchor="middle">
          Headmaster, SSGHS
        </text>

        <circle cx="500" cy="625" r="35" fill="none" stroke="#b45309" stroke-width="2" />
        <text x="500" y="625" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#b45309" text-anchor="middle">
          OFFICIAL
        </text>
        <text x="500" y="638" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#b45309" text-anchor="middle">
          SEAL
        </text>

        <line x1="680" y1="630" x2="880" y2="630" stroke="#4b5563" stroke-width="1.5" />
        <text x="780" y="650" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#4b5563" text-anchor="middle">
          Controller of Examinations
        </text>
      </svg>
    `;

    const imgBuffer = await sharp(Buffer.from(svg))
      .jpeg({ quality: 90 })
      .toBuffer();

    await fs.writeFile(path.join(targetDir, "document.jpg"), imgBuffer);

    const fileUrl = `/api/media/proofs/${id}/document.jpg`;
    await prisma.verificationRequest.update({
      where: { id: req.id },
      data: {
        proofFileUrl: fileUrl,
        proofMime: "image/jpeg",
      },
    });

    console.log(`  ✓ Generated certificate for ${fullName} (${batch}, Roll ${roll}) -> ${fileUrl}`);
  }

  console.log("All sample certificates created and linked successfully!");
}

generateProofs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
