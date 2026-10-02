import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const currentYear = new Date().getFullYear();
    const firstYear = 1985;

    // Group profiles by sscBatch to get real alumni counts
    const batchCounts = await prisma.alumniProfile.groupBy({
      by: ["sscBatch"],
      _count: { id: true },
      where: {
        sscBatch: { gte: firstYear, lte: currentYear },
        verificationStatus: { not: "REJECTED" },
      },
    });

    const countMap = new Map<number, number>();
    for (const b of batchCounts) {
      if (b.sscBatch) countMap.set(b.sscBatch, b._count.id);
    }

    // Generate list of all batches from currentYear down to 1985
    const batches = [];
    for (let y = currentYear; y >= firstYear; y--) {
      const count = countMap.get(y) || 0;
      batches.push({
        year: y,
        name: `SSC Batch ${y}`,
        tagline: `Class of ${y} Alumni`,
        totalAlumni: count,
        classRepresentative: count > 0 ? "Batch Coordinator" : "Committee Liaison",
        representativePhone: "+880 1745-950025",
        coverImage: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=80",
        description: `Official network for Sabuj Shikshayatan Government High School graduates of ${y}.`,
      });
    }

    return NextResponse.json({ batches });
  } catch (err) {
    console.error("Failed to load batches:", err);
    return NextResponse.json({ error: "Failed to load batches" }, { status: 500 });
  }
}
