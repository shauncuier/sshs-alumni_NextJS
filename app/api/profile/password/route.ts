import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/session-user";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { requireRateLimit, readJsonBody } from "@/lib/request-security";
import { AppError } from "@/lib/app-error";
import { isEnvSuperAdmin } from "@/lib/admin/super-admin";

const MIN_PASSWORD_LENGTH = 8;

// POST /api/profile/password — change the signed-in member's password.
export async function POST(req: Request) {
  try {
    requireRateLimit(req, "password-change", { limit: 5, windowMs: 15 * 60_000 });

    const session = await getMemberSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isEnvSuperAdmin(session.user.email)) {
      // SUPER_ADMIN_PASSWORD would overwrite a new password at the next restart.
      return NextResponse.json(
        { error: "The super admin password is set by SUPER_ADMIN_PASSWORD in the server environment." },
        { status: 403 }
      );
    }

    let body: { currentPassword?: unknown; newPassword?: unknown };
    try {
      body = await readJsonBody(req);
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const { currentPassword, newPassword } = body;
    if (typeof currentPassword !== "string" || !currentPassword) {
      return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
    }
    if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `The new password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 }
      );
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: "The new password must be different from the current one." }, { status: 400 });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, passwordHash: true },
      });
      // Require the current password, so an unattended signed-in browser cannot take over the account.
      if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
        return NextResponse.json({ error: "Your current password is incorrect." }, { status: 403 });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(newPassword, 12), sessionVersion: { increment: 1 } },
      });
      return NextResponse.json({ message: "Password changed." });
    } catch (dbErr) {
      console.error("Password change failed:", dbErr);
      return NextResponse.json({ error: "Could not change your password. Please try again." }, { status: 503 });
    }
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Password change route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
