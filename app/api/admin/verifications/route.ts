import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as unknown as { role?: string })?.role;

    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    try {
      const requests = await prisma.verificationRequest.findMany({
        where: { status: "PENDING" },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ requests, total: requests.length });
    } catch {
      return NextResponse.json({ requests: [], total: 0 });
    }
  } catch (error) {
    console.error("Admin verification fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
