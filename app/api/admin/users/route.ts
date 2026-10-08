import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

export async function GET() {
  try {
    const me = await getSessionUser();
    if (!me || !isAdminRole(me.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const [users, roleCounts, totalVerified] = await Promise.all([
      prisma.user.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          profile: {
            select: {
              fullName: true,
              sscBatch: true,
              phone: true,
            },
          },
        },
      }),
      prisma.user.groupBy({
        by: ["role"],
        _count: { id: true },
      }),
      prisma.user.count({
        where: { status: "VERIFIED" },
      }),
    ]);

    const countByRole = new Map<string, number>();
    for (const r of roleCounts) {
      countByRole.set(r.role, r._count.id);
    }

    const formattedUsers = users.map((u) => ({
      id: u.id,
      name: u.profile?.fullName || u.email.split("@")[0],
      email: u.email,
      role: u.role,
      status: u.status,
      batch: u.profile?.sscBatch || null,
      phone: u.profile?.phone || null,
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json({
      stats: {
        totalUsers: users.length,
        superAdmins: countByRole.get("SUPER_ADMIN") || 0,
        admins: countByRole.get("ADMIN") || 0,
        moderators: countByRole.get("MODERATOR") || 0,
        alumni: countByRole.get("ALUMNI") || 0,
        verifiedAlumni: totalVerified,
      },
      users: formattedUsers,
    });
  } catch (error) {
    console.error("Failed to load admin users report:", error);
    return NextResponse.json({ error: "Failed to load users report" }, { status: 500 });
  }
}
