import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

/**
 * The one super admin, defined by SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD, with an
 * alumni profile from SUPER_ADMIN_NAME and SUPER_ADMIN_SSC_BATCH (created once if missing;
 * the profile is then the member's own to edit).
 * The environment is the source of truth: ensureSuperAdmin (run at every server
 * start and by `npm run db:super-admin`) creates the account, or restores its role,
 * status and password to match. Changing SUPER_ADMIN_PASSWORD and restarting
 * therefore resets the password and signs out the old sessions. The admin console
 * cannot grant SUPER_ADMIN or change this account.
 */

export const MIN_SUPER_ADMIN_PASSWORD_LENGTH = 12;
const BCRYPT_COST = 12;

export function envSuperAdminEmail(): string | null {
  return process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() || null;
}

export function isEnvSuperAdmin(email: string | null | undefined): boolean {
  const envEmail = envSuperAdminEmail();
  return Boolean(envEmail && email && email.trim().toLowerCase() === envEmail);
}

export type EnsureResult = "skipped" | "created" | "updated" | "unchanged";

/** The profile the super admin starts with, from SUPER_ADMIN_NAME / SUPER_ADMIN_SSC_BATCH. */
function envProfile(email: string) {
  const name = process.env.SUPER_ADMIN_NAME?.trim() || email.split("@")[0];
  const batch = Number(process.env.SUPER_ADMIN_SSC_BATCH);
  const sscBatch = Number.isInteger(batch) && batch > 1900 && batch <= new Date().getFullYear() ? batch : 0;
  return {
    fullName: name,
    sscBatch,
    graduationYear: sscBatch,
    profession: "Alumnus",
    locationCity: "Chattogram",
    locationCountry: "Bangladesh",
    avatarUrl: "/logo.png",
    verificationStatus: "VERIFIED" as const,
  };
}

export async function ensureSuperAdmin(): Promise<EnsureResult> {
  const email = envSuperAdminEmail();
  if (!email) return "skipped";
  const password = process.env.SUPER_ADMIN_PASSWORD ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("SUPER_ADMIN_EMAIL is not a valid email address.");
  if (password.length < MIN_SUPER_ADMIN_PASSWORD_LENGTH) {
    throw new Error(`SUPER_ADMIN_PASSWORD must be set and at least ${MIN_SUPER_ADMIN_PASSWORD_LENGTH} characters.`);
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, status: true, disabledAt: true, passwordHash: true },
  });
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, BCRYPT_COST),
        role: "SUPER_ADMIN",
        status: "VERIFIED",
        profile: { create: envProfile(email) },
      },
    });
    return "created";
  }

  // An older super admin account without a profile gets one (never overwrites edits).
  const hasProfile = await prisma.alumniProfile.findUnique({ where: { userId: existing.id }, select: { id: true } });
  if (!hasProfile) await prisma.alumniProfile.create({ data: { userId: existing.id, ...envProfile(email) } });

  const passwordChanged = !(await bcrypt.compare(password, existing.passwordHash));
  const accessChanged = existing.role !== "SUPER_ADMIN" || existing.status !== "VERIFIED" || existing.disabledAt !== null;
  if (!passwordChanged && !accessChanged) return "unchanged";
  await prisma.user.update({
    where: { id: existing.id },
    data: {
      role: "SUPER_ADMIN",
      status: "VERIFIED",
      disabledAt: null,
      ...(passwordChanged ? { passwordHash: await bcrypt.hash(password, BCRYPT_COST), sessionVersion: { increment: 1 } } : {}),
    },
  });
  return "updated";
}
