import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { authorizeCredentials } from "@/lib/auth";
import { createUser, listUsers, updateUser, type Actor } from "@/lib/admin/users";
import { ensureSuperAdmin } from "@/lib/admin/super-admin";
import { makeMember, resetDatabase } from "../helpers/db";

const ENV_EMAIL = "root@example.test";
const ENV_PASSWORD = "Super-Admin-Pw-2026";

beforeEach(async () => {
  await resetDatabase();
  vi.stubEnv("SUPER_ADMIN_EMAIL", ENV_EMAIL);
  vi.stubEnv("SUPER_ADMIN_PASSWORD", ENV_PASSWORD);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const actorFor = async (role: "ADMIN" | "SUPER_ADMIN"): Promise<Actor> => {
  if (role === "SUPER_ADMIN") {
    await ensureSuperAdmin();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: ENV_EMAIL } });
    return { id: user.id, email: user.email, role: user.role };
  }
  const admin = await makeMember({ role: "ADMIN" });
  return { ...admin, role: "ADMIN" };
};
const newUser = { fullName: "Committee Member", email: "Committee@Example.test", password: "Committee-Pw-1", sscBatch: 2004, phone: "01711000222" };

describe("ensureSuperAdmin", () => {
  it("creates the env super admin, who can sign in", async () => {
    expect(await ensureSuperAdmin()).toBe("created");
    const user = await prisma.user.findUniqueOrThrow({ where: { email: ENV_EMAIL } });
    expect(user).toMatchObject({ role: "SUPER_ADMIN", status: "VERIFIED", disabledAt: null });
    await expect(authorizeCredentials({ email: ENV_EMAIL, password: ENV_PASSWORD })).resolves.toMatchObject({ role: "SUPER_ADMIN" });
    expect(await ensureSuperAdmin()).toBe("unchanged");
  });

  it("restores role, access and the env password, ending old sessions on a password change", async () => {
    await ensureSuperAdmin();
    await prisma.user.update({ where: { email: ENV_EMAIL }, data: { role: "ALUMNI", disabledAt: new Date() } });
    expect(await ensureSuperAdmin()).toBe("updated");
    let user = await prisma.user.findUniqueOrThrow({ where: { email: ENV_EMAIL } });
    expect(user).toMatchObject({ role: "SUPER_ADMIN", disabledAt: null, sessionVersion: 0 });

    vi.stubEnv("SUPER_ADMIN_PASSWORD", "A-New-Super-Pw-99");
    expect(await ensureSuperAdmin()).toBe("updated");
    user = await prisma.user.findUniqueOrThrow({ where: { email: ENV_EMAIL } });
    expect(await bcrypt.compare("A-New-Super-Pw-99", user.passwordHash)).toBe(true);
    expect(user.sessionVersion).toBe(1);
  });

  it("does nothing without SUPER_ADMIN_EMAIL and refuses a short password", async () => {
    vi.stubEnv("SUPER_ADMIN_EMAIL", "");
    expect(await ensureSuperAdmin()).toBe("skipped");
    vi.stubEnv("SUPER_ADMIN_EMAIL", ENV_EMAIL);
    vi.stubEnv("SUPER_ADMIN_PASSWORD", "short");
    await expect(ensureSuperAdmin()).rejects.toThrow(/at least 12/);
    expect(await prisma.user.count()).toBe(0);
  });
});

describe("createUser", () => {
  it("adds a verified account with a profile", async () => {
    const admin = await actorFor("ADMIN");
    const row = await createUser(admin, { ...newUser, role: "MODERATOR" });
    expect(row).toMatchObject({ email: "committee@example.test", role: "MODERATOR", status: "VERIFIED", batch: 2004, disabled: false });
    await expect(authorizeCredentials({ email: "committee@example.test", password: newUser.password })).resolves.toMatchObject({ role: "MODERATOR" });
  });

  it("lets only the super admin create admins, and nobody create a super admin", async () => {
    const admin = await actorFor("ADMIN");
    await expect(createUser(admin, { ...newUser, role: "ADMIN" })).rejects.toMatchObject({ status: 403 });
    const root = await actorFor("SUPER_ADMIN");
    await expect(createUser(root, { ...newUser, role: "SUPER_ADMIN" })).rejects.toMatchObject({ status: 403 });
    await expect(createUser(root, { ...newUser, role: "ADMIN" })).resolves.toMatchObject({ role: "ADMIN" });
  });

  it("refuses duplicates, the super admin's address and bad input", async () => {
    const admin = await actorFor("ADMIN");
    await createUser(admin, { ...newUser, role: "ALUMNI" });
    await expect(createUser(admin, { ...newUser, role: "ALUMNI" })).rejects.toMatchObject({ status: 409 });
    await expect(createUser(admin, { ...newUser, email: ENV_EMAIL, role: "ALUMNI" })).rejects.toMatchObject({ status: 409 });
    await expect(createUser(admin, { ...newUser, email: "x@example.test", password: "short", role: "ALUMNI" })).rejects.toMatchObject({ status: 400 });
    await expect(createUser(admin, { ...newUser, email: "y@example.test", sscBatch: 1900, role: "ALUMNI" })).rejects.toMatchObject({ status: 400 });
  });
});

describe("updateUser", () => {
  it("changes a member's role and ends their sessions", async () => {
    const admin = await actorFor("ADMIN");
    const member = await makeMember();
    expect(await updateUser(admin, member.id, { action: "role", role: "MODERATOR" })).toMatchObject({ role: "MODERATOR" });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: member.id } })).sessionVersion).toBe(1);
  });

  it("disables and re-enables an account, staff included", async () => {
    const root = await actorFor("SUPER_ADMIN");
    const admin = await makeMember({ role: "ADMIN", email: "admin2@example.test" });
    expect(await updateUser(root, admin.id, { action: "disable" })).toMatchObject({ disabled: true });
    await expect(authorizeCredentials({ email: "admin2@example.test", password: "Member-Pw-1234" })).rejects.toThrow(/disabled/);
    expect(await updateUser(root, admin.id, { action: "enable" })).toMatchObject({ disabled: false });
    await expect(authorizeCredentials({ email: "admin2@example.test", password: "Member-Pw-1234" })).resolves.toMatchObject({ role: "ADMIN" });
  });

  it("resets a password", async () => {
    const admin = await actorFor("ADMIN");
    const member = await makeMember({ email: "m@example.test" });
    await updateUser(admin, member.id, { action: "password", password: "Fresh-Pw-2026" });
    await expect(authorizeCredentials({ email: "m@example.test", password: "Fresh-Pw-2026" })).resolves.toBeTruthy();
    await expect(updateUser(admin, member.id, { action: "password", password: "short" })).rejects.toMatchObject({ status: 400 });
  });

  it("enforces who may manage whom", async () => {
    const admin = await actorFor("ADMIN");
    const root = await actorFor("SUPER_ADMIN");
    const otherAdmin = await makeMember({ role: "ADMIN" });
    const member = await makeMember();
    // An admin cannot touch other admins, the super admin, or themselves, nor promote to admin.
    await expect(updateUser(admin, otherAdmin.id, { action: "disable" })).rejects.toMatchObject({ status: 403 });
    await expect(updateUser(admin, root.id, { action: "disable" })).rejects.toMatchObject({ status: 403 });
    await expect(updateUser(admin, admin.id, { action: "role", role: "ALUMNI" })).rejects.toMatchObject({ status: 403 });
    await expect(updateUser(admin, member.id, { action: "role", role: "ADMIN" })).rejects.toMatchObject({ status: 403 });
    // The super admin manages admins, but the console never grants SUPER_ADMIN or edits the env account.
    await expect(updateUser(root, otherAdmin.id, { action: "role", role: "MODERATOR" })).resolves.toMatchObject({ role: "MODERATOR" });
    await expect(updateUser(root, member.id, { action: "role", role: "SUPER_ADMIN" })).rejects.toMatchObject({ status: 403 });
    await expect(updateUser(root, root.id, { action: "disable" })).rejects.toMatchObject({ status: 403 });
    await expect(updateUser(root, "missing-id", { action: "disable" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("listUsers", () => {
  it("searches, filters and flags the env super admin", async () => {
    await actorFor("SUPER_ADMIN");
    await makeMember({ email: "alpha@example.test" });
    const disabled = await makeMember({ email: "beta@example.test" });
    await prisma.user.update({ where: { id: disabled.id }, data: { disabledAt: new Date() } });

    const all = await listUsers({});
    expect(all.total).toBe(3);
    expect(all.stats).toMatchObject({ totalUsers: 3, superAdmins: 1, disabled: 1 });
    expect(all.users.find((u) => u.email === ENV_EMAIL)?.isEnvSuperAdmin).toBe(true);

    expect((await listUsers({ q: "alpha" })).users.map((u) => u.email)).toEqual(["alpha@example.test"]);
    expect((await listUsers({ status: "DISABLED" })).users.map((u) => u.email)).toEqual(["beta@example.test"]);
    expect((await listUsers({ role: "SUPER_ADMIN" })).total).toBe(1);
  });
});
