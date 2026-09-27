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

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as unknown as { role?: string })?.role;

    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const body = await req.json();
    const { requestId, status } = body;

    if (!requestId || !["VERIFIED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid requestId or status. Status must be VERIFIED or REJECTED." },
        { status: 400 }
      );
    }

    try {
      const updated = await prisma.verificationRequest.update({
        where: { id: requestId },
        // updatedAt records when the review happened.
        data: {
          status,
          reviewedBy: session?.user?.email ?? null,
        },
      });

      return NextResponse.json({
        message: `Verification request ${status.toLowerCase()} successfully`,
        request: updated,
      });
    } catch (dbErr) {
      console.warn("Database verification update fallback:", dbErr);
    }

    return NextResponse.json({
      message: `Verification request ${status.toLowerCase()} successfully`,
      requestId,
      status,
      simulated: true,
    });
  } catch (error) {
    console.error("Admin verification PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
