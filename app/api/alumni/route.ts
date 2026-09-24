import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sampleAlumni, AlumniMember } from "@/lib/data";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.toLowerCase() || "";
    const batch = searchParams.get("batch");
    const profession = searchParams.get("profession");
    const location = searchParams.get("location");
    const verifiedOnly = searchParams.get("verified") === "true";

    // 1. Try querying Prisma / MongoDB
    try {
      const whereClause: Record<string, unknown> = {};

      if (batch && batch !== "all") {
        whereClause.sscBatch = parseInt(batch, 10);
      }

      if (verifiedOnly) {
        whereClause.verificationStatus = "VERIFIED";
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profiles: any[] = await (prisma as any).alumniProfile.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              email: true,
              role: true,
              status: true,
            },
          },
        },
        orderBy: { sscBatch: "desc" },
      });

      if (profiles && profiles.length > 0) {
        let filtered = profiles;
        if (q) {
          filtered = filtered.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: any) =>
              p.fullName?.toLowerCase().includes(q) ||
              p.profession?.toLowerCase().includes(q) ||
              (p.company && p.company.toLowerCase().includes(q)) ||
              p.locationCity?.toLowerCase().includes(q)
          );
        }
        return NextResponse.json({ alumni: filtered, total: filtered.length, source: "database" });
      }
    } catch (dbErr) {
      console.warn("Database alumni query fallback to static data:", dbErr);
    }

    // 2. High-performance dataset
    let results: AlumniMember[] = [...sampleAlumni];

    if (q) {
      results = results.filter(
        (a) =>
          a.fullName.toLowerCase().includes(q) ||
          a.profession.toLowerCase().includes(q) ||
          a.company.toLowerCase().includes(q) ||
          a.locationCity.toLowerCase().includes(q) ||
          a.skills.some((s) => s.toLowerCase().includes(q))
      );
    }

    if (batch && batch !== "all") {
      const bYear = parseInt(batch, 10);
      results = results.filter((a) => a.sscBatch === bYear);
    }

    if (profession && profession !== "all") {
      results = results.filter((a) =>
        a.profession.toLowerCase().includes(profession.toLowerCase())
      );
    }

    if (location && location !== "all") {
      results = results.filter((a) =>
        a.locationCountry.toLowerCase().includes(location.toLowerCase()) ||
        a.locationCity.toLowerCase().includes(location.toLowerCase())
      );
    }

    if (verifiedOnly) {
      results = results.filter((a) => a.isVerified);
    }

    return NextResponse.json({
      alumni: results,
      total: results.length,
      source: "fallback-dataset",
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to fetch alumni directory" }, { status: 500 });
  }
}
