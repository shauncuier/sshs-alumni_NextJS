import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { deleteUser, type Actor } from "@/lib/admin/users";
import { ensureSuperAdmin } from "@/lib/admin/super-admin";
import { DELETE } from "@/app/api/admin/users/[id]/route";

const ENV_EMAIL = "root@example.test";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
  vi.stubEnv("SUPER_ADMIN_EMAIL", ENV_EMAIL);
  vi.stubEnv("SUPER_ADMIN_PASSWORD", "Super-Admin-Pw-2026");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

const adminActor = async (): Promise<Actor> => ({ ...(await makeMember({ role: "ADMIN" })), role: "ADMIN" });

/** A member with something in every table an account touches. */
async function busyMember() {
  const m = await makeMember();
  const other = await makeMember();
  const avatarDir = path.join(process.env.UPLOADS_DIR!, "avatars", "av-test-1");
  await fs.mkdir(avatarDir, { recursive: true });
  await fs.writeFile(path.join(avatarDir, "avatar.webp"), "x");
  await prisma.alumniProfile.update({ where: { userId: m.id }, data: { avatarUrl: "/api/media/avatars/av-test-1/avatar.webp" } });

  const othersPost = await prisma.post.create({ data: { authorId: other.id, content: "Hello", likesCount: 1, commentsCount: 1 } });
  await prisma.postLike.create({ data: { postId: othersPost.id, userId: m.id } });
  await prisma.comment.create({ data: { postId: othersPost.id, authorId: m.id, content: "Hi" } });
  await prisma.post.create({ data: { authorId: m.id, content: "Mine" } });
  await prisma.message.create({ data: { senderId: m.id, receiverId: other.id, content: "Hey" } });
  const event = await makeEvent({ slug: "picnic" });
  await prisma.eventRegistration.create({ data: { eventId: event.id, userId: m.id, totalFee: 500, status: "PENDING_PAYMENT" } });
  const campaign = await prisma.donationCampaign.create({ data: { slug: "library", title: "Library", description: "Books" } });
  const donation = await prisma.donation.create({ data: { campaignId: campaign.id, userId: m.id, donorName: "Member", amount: 1000, paymentMethod: "bKash" } });
  await prisma.volunteer.create({ data: { fullName: "Member", email: m.email, phone: "01711000777", sscBatch: 2000, subcommittee: "Logistics", userId: m.id } });
  return { m, other, othersPost, donation, avatarDir };
}

describe("deleting an account", () => {
  it("removes everything that is only theirs, keeps donations and others' posts in step", async () => {
    const admin = await adminActor();
    const { m, othersPost, donation, avatarDir } = await busyMember();

    const deleted = await deleteUser(admin, m.id, ` ${m.email.toUpperCase()} `);
    expect(deleted).toMatchObject({ email: m.email, registrations: 1, donationsKept: 1 });

    expect(await prisma.user.findUnique({ where: { id: m.id } })).toBeNull();
    expect(await prisma.alumniProfile.count({ where: { userId: m.id } })).toBe(0);
    expect(await prisma.post.count({ where: { authorId: m.id } })).toBe(0);
    expect(await prisma.comment.count({ where: { authorId: m.id } })).toBe(0);
    expect(await prisma.postLike.count({ where: { userId: m.id } })).toBe(0);
    expect(await prisma.message.count()).toBe(0);
    expect(await prisma.eventRegistration.count()).toBe(0);
    expect(await prisma.volunteer.count()).toBe(0);
    expect(await prisma.post.findUniqueOrThrow({ where: { id: othersPost.id } })).toMatchObject({ likesCount: 0, commentsCount: 0 });
    expect(await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })).toMatchObject({ userId: null, amount: 1000 });
    await expect(fs.stat(avatarDir)).rejects.toThrow();
  });

  it("refuses: wrong confirmation, own account, admins (unless super admin), the super admin, confirmed payments", async () => {
    const admin = await adminActor();
    const member = await makeMember();
    await expect(deleteUser(admin, member.id, "someone@else.test")).rejects.toMatchObject({ code: "CONFIRM_EMAIL" });
    await expect(deleteUser(admin, admin.id, admin.email)).rejects.toMatchObject({ status: 403 });

    const otherAdmin = await makeMember({ role: "ADMIN" });
    await expect(deleteUser(admin, otherAdmin.id, otherAdmin.email)).rejects.toMatchObject({ status: 403 });
    await ensureSuperAdmin();
    const root = await prisma.user.findUniqueOrThrow({ where: { email: ENV_EMAIL } });
    await expect(deleteUser(admin, root.id, root.email)).rejects.toMatchObject({ status: 403 });
    await expect(deleteUser({ id: root.id, email: root.email, role: "SUPER_ADMIN" }, otherAdmin.id, otherAdmin.email)).resolves.toBeTruthy();

    const event = await makeEvent({ slug: "jubilee" });
    await prisma.eventRegistration.create({ data: { eventId: event.id, userId: member.id, totalFee: 1500, status: "CONFIRMED" } });
    await expect(deleteUser(admin, member.id, member.email)).rejects.toMatchObject({ status: 409, code: "HAS_PAYMENTS" });
    expect(await prisma.user.count({ where: { id: member.id } })).toBe(1);
  });

  it("the route needs an admin and writes the deletion to the activity log", async () => {
    const member = await makeMember();
    const del = (body: unknown) =>
      DELETE(new Request(`http://x/api/admin/users/${member.id}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), {
        params: Promise.resolve({ id: member.id }),
      });

    const mod = await makeMember({ role: "MODERATOR" });
    session.user = { id: mod.id, email: mod.email, role: "MODERATOR" };
    expect((await del({ confirmEmail: member.email })).status).toBe(403);

    const admin = await makeMember({ role: "ADMIN" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    const res = await del({ confirmEmail: member.email });
    expect(res.status).toBe(200);
    const log = await prisma.activityLog.findFirstOrThrow({ where: { action: "user.deleted" } });
    expect(log.summary).toContain(member.email);
  });
});
