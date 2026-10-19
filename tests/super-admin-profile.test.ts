import { afterEach, beforeEach, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { ensureSuperAdmin } from "@/lib/admin/super-admin";
import { resetDatabase } from "./helpers/db";

beforeEach(async () => {
  await resetDatabase();
  vi.stubEnv("SUPER_ADMIN_EMAIL", "Root@Example.test");
  vi.stubEnv("SUPER_ADMIN_PASSWORD", "Super-Admin-Pw-2026");
  vi.stubEnv("SUPER_ADMIN_NAME", "Jashedul Islam Shaun");
  vi.stubEnv("SUPER_ADMIN_SSC_BATCH", "2013");
});
afterEach(() => vi.unstubAllEnvs());

it("the super admin gets an alumni profile from the env, once, and keeps their own edits", async () => {
  expect(await ensureSuperAdmin()).toBe("created");
  const user = await prisma.user.findUniqueOrThrow({ where: { email: "root@example.test" }, include: { profile: true } });
  expect(user).toMatchObject({ role: "SUPER_ADMIN", status: "VERIFIED" });
  expect(user.profile).toMatchObject({ fullName: "Jashedul Islam Shaun", sscBatch: 2013, verificationStatus: "VERIFIED" });

  await prisma.alumniProfile.update({ where: { userId: user.id }, data: { fullName: "J. I. Shaun" } });
  await ensureSuperAdmin();
  expect((await prisma.alumniProfile.findUniqueOrThrow({ where: { userId: user.id } })).fullName).toBe("J. I. Shaun");

  // An older super admin account without a profile gets one.
  await prisma.alumniProfile.delete({ where: { userId: user.id } });
  await ensureSuperAdmin();
  expect(await prisma.alumniProfile.findUniqueOrThrow({ where: { userId: user.id } })).toMatchObject({ sscBatch: 2013 });
});
