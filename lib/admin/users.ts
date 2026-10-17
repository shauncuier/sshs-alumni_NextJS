import { Prisma, type Role, type VerificationStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { hashMemberPassword } from "@/lib/members/create-member";
import { isEnvSuperAdmin } from "./super-admin";
import { FIRST_SSC_BATCH } from "@/lib/data";
import { canonicalPhone, isPhoneClash, PHONE_TAKEN_MESSAGE, requirePhoneFree } from "@/lib/phone-registry";
import path from "node:path";
import { removeAvatarDir, uploadsRoot } from "@/lib/media/avatars";

/**
 * User management for the admin console. Who may do what:
 *  - ADMIN manages alumni and moderators.
 *  - SUPER_ADMIN also manages admins. There is one super admin, defined in the
 *    server environment (see super-admin.ts); the console can neither grant the
 *    role nor change that account.
 *  - Nobody changes their own account here (no locking yourself out).
 * Every change bumps sessionVersion, so the member's open sessions end at once.
 */

export const ASSIGNABLE_ROLES = ["ALUMNI", "MODERATOR", "ADMIN"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
export const USER_PAGE_SIZE = 25;
const MIN_PASSWORD_LENGTH = 8;

export type Actor = { id: string; email: string; role: string };
type Target = { id: string; email: string; role: string };

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: VerificationStatus;
  disabled: boolean;
  batch: number | null;
  phone: string | null;
  createdAt: string;
  /** The environment-defined super admin: shown, never editable. */
  isEnvSuperAdmin: boolean;
}

const rowSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  disabledAt: true,
  createdAt: true,
  profile: { select: { fullName: true, sscBatch: true, phone: true } },
} satisfies Prisma.UserSelect;

function toRow(u: Prisma.UserGetPayload<{ select: typeof rowSelect }>): AdminUserRow {
  return {
    id: u.id,
    name: u.profile?.fullName || u.email.split("@")[0],
    email: u.email,
    role: u.role,
    status: u.status,
    disabled: Boolean(u.disabledAt),
    batch: u.profile?.sscBatch ?? null,
    phone: u.profile?.phone ?? null,
    createdAt: u.createdAt.toISOString(),
    isEnvSuperAdmin: isEnvSuperAdmin(u.email),
  };
}

export function isAssignableRole(value: unknown): value is AssignableRole {
  return typeof value === "string" && (ASSIGNABLE_ROLES as readonly string[]).includes(value);
}

/** Why `actor` may not change `target`, or null when they may. */
export function manageBlock(actor: Actor, target: Target): string | null {
  if (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") return "Only admins can manage users.";
  if (actor.id === target.id) return "You cannot change your own account here.";
  if (isEnvSuperAdmin(target.email)) return "The super admin account is managed in the server environment.";
  if ((target.role === "ADMIN" || target.role === "SUPER_ADMIN") && actor.role !== "SUPER_ADMIN") {
    return "Only the super admin can manage admin accounts.";
  }
  return null;
}

/** Why `actor` may not give someone `role`, or null when they may. */
export function roleGrantBlock(actor: Actor, role: unknown): string | null {
  if (!isAssignableRole(role)) return "Please choose Alumni, Moderator or Admin.";
  if (role === "ADMIN" && actor.role !== "SUPER_ADMIN") return "Only the super admin can make someone an admin.";
  return null;
}

export async function listUsers(args: { q?: string | null; role?: string | null; status?: string | null; page?: number }) {
  const q = args.q?.trim() ?? "";
  const where: Prisma.UserWhereInput = {};
  if (args.role && ["SUPER_ADMIN", "ADMIN", "MODERATOR", "ALUMNI"].includes(args.role)) where.role = args.role as Role;
  if (args.status === "DISABLED") where.disabledAt = { not: null };
  else if (args.status && ["PENDING", "VERIFIED", "REJECTED"].includes(args.status)) {
    where.status = args.status as VerificationStatus;
    where.disabledAt = null;
  }
  if (q) {
    const batch = /^\d{4}$/.test(q) ? Number(q) : null;
    where.OR = [
      { email: { contains: q } },
      { profile: { fullName: { contains: q } } },
      { profile: { phone: { contains: q } } },
      ...(batch ? [{ profile: { sscBatch: batch } }] : []),
    ];
  }

  const page = Math.max(1, Math.floor(args.page ?? 1));
  const [users, total, roleCounts, disabled] = await Promise.all([
    prisma.user.findMany({ where, select: rowSelect, orderBy: { createdAt: "desc" }, skip: (page - 1) * USER_PAGE_SIZE, take: USER_PAGE_SIZE }),
    prisma.user.count({ where }),
    prisma.user.groupBy({ by: ["role"], _count: { id: true } }),
    prisma.user.count({ where: { disabledAt: { not: null } } }),
  ]);
  const byRole = Object.fromEntries(roleCounts.map((r) => [r.role, r._count.id])) as Partial<Record<Role, number>>;
  return {
    users: users.map(toRow),
    total,
    page,
    pageSize: USER_PAGE_SIZE,
    stats: {
      totalUsers: Object.values(byRole).reduce((a, b) => a + (b ?? 0), 0),
      superAdmins: byRole.SUPER_ADMIN ?? 0,
      admins: byRole.ADMIN ?? 0,
      moderators: byRole.MODERATOR ?? 0,
      alumni: byRole.ALUMNI ?? 0,
      disabled,
    },
  };
}

export interface CreateUserInput {
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
  sscBatch?: unknown;
  phone?: unknown;
}

/** Creates a verified account (committee member, moderator, or an alumnus added by hand). */
export async function createUser(actor: Actor, input: CreateUserInput): Promise<AdminUserRow> {
  if (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", 403, "Only admins can manage users.");
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = typeof input.phone === "string" && input.phone.trim() ? canonicalPhone(input.phone) : "";
  const batch = Number(input.sscBatch);
  if (!fullName) throw new AppError("INVALID_USER", 400, "Please enter the full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError("INVALID_USER", 400, "Please enter a valid email address.");
  if (!Number.isInteger(batch) || batch < FIRST_SSC_BATCH || batch > new Date().getFullYear()) {
    throw new AppError("INVALID_USER", 400, "Please choose the SSC batch year.");
  }
  const blocked = roleGrantBlock(actor, input.role);
  if (blocked) throw new AppError("FORBIDDEN_ROLE", 403, blocked);
  if (isEnvSuperAdmin(email)) throw new AppError("EMAIL_EXISTS", 409, "That address belongs to the super admin.");
  const passwordHash = await hashMemberPassword(input.password);
  if (!passwordHash) throw new AppError("INVALID_USER", 400, `The password must be at least ${MIN_PASSWORD_LENGTH} characters.`);

  if (phone) await requirePhoneFree(phone);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: input.role as AssignableRole,
        status: "VERIFIED",
        profile: {
          create: {
            fullName,
            sscBatch: batch,
            graduationYear: batch,
            profession: "Alumnus",
            locationCity: "Chattogram",
            locationCountry: "Bangladesh",
            phone: phone || null,
            avatarUrl: "/logo.png",
            verificationStatus: "VERIFIED",
          },
        },
      },
      select: rowSelect,
    });
    console.info(`[admin-users] ${actor.email} created ${email} as ${user.role}`);
    return toRow(user);
  } catch (err) {
    if (isPhoneClash(err)) throw new AppError("PHONE_TAKEN", 409, PHONE_TAKEN_MESSAGE);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError("EMAIL_EXISTS", 409, "An account with this email already exists.");
    }
    throw err;
  }
}

export type UserChange =
  | { action: "role"; role: unknown }
  | { action: "disable" }
  | { action: "enable" }
  | { action: "password"; password: unknown };

export async function updateUser(actor: Actor, targetId: string, change: UserChange): Promise<AdminUserRow> {
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, email: true, role: true } });
  if (!target) throw new AppError("USER_NOT_FOUND", 404, "User not found.");
  const blocked = manageBlock(actor, target);
  if (blocked) throw new AppError("FORBIDDEN", 403, blocked);

  let data: Prisma.UserUpdateInput;
  switch (change.action) {
    case "role": {
      const roleBlocked = roleGrantBlock(actor, change.role);
      if (roleBlocked) throw new AppError("FORBIDDEN_ROLE", 403, roleBlocked);
      data = { role: change.role as AssignableRole };
      break;
    }
    case "disable":
      data = { disabledAt: new Date() };
      break;
    case "enable":
      data = { disabledAt: null };
      break;
    case "password": {
      const passwordHash = await hashMemberPassword(change.password);
      if (!passwordHash) throw new AppError("INVALID_PASSWORD", 400, `The password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      data = { passwordHash };
      break;
    }
    default:
      throw new AppError("INVALID_REQUEST", 400, "Invalid request.");
  }

  // Ending the member's sessions makes a new role, a lock-out or a new password take effect now.
  const user = await prisma.user.update({ where: { id: target.id }, data: { ...data, sessionVersion: { increment: 1 } }, select: rowSelect });
  const detail = change.action === "role" ? ` to ${user.role}` : "";
  console.info(`[admin-users] ${actor.email} ${change.action}${detail}: ${target.email}`);
  return toRow(user);
}

/** The folder of an uploaded avatar or proof, from its /api/media/... URL; null for anything else. */
function mediaDir(url: string | null | undefined): string | null {
  const m = /^\/api\/media\/(avatars|proofs)\/([A-Za-z0-9-]+)\//.exec(url ?? "");
  return m ? path.join(uploadsRoot(), m[1], m[2]) : null;
}

export interface DeletedUser {
  id: string;
  email: string;
  name: string;
  /** Unconfirmed event registrations removed with the account. */
  registrations: number;
  /** Donations kept as money records, now without the account. */
  donationsKept: number;
}

/**
 * Deletes an account and everything that is only theirs: profile, photo and proof
 * files, posts, comments, likes, messages, notifications, unconfirmed registrations,
 * mentor profile, mentorship requests, job posts and applications, volunteer forms.
 * Refused while they hold a confirmed paid registration: that payment record must
 * stay (disable the account instead). Donations are kept, unlinked from the account.
 * `confirmEmail` must repeat the account's email, against deleting the wrong row.
 */
export async function deleteUser(actor: Actor, targetId: string, confirmEmail: unknown): Promise<DeletedUser> {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      email: true,
      role: true,
      profile: { select: { fullName: true, avatarUrl: true, avatarOriginalUrl: true } },
      verificationRequests: { select: { proofFileUrl: true } },
    },
  });
  if (!target) throw new AppError("USER_NOT_FOUND", 404, "User not found.");
  if (actor.id === target.id) throw new AppError("FORBIDDEN", 403, "You cannot delete your own account.");
  const blocked = manageBlock(actor, target);
  if (blocked) throw new AppError("FORBIDDEN", 403, blocked);
  if (typeof confirmEmail !== "string" || confirmEmail.trim().toLowerCase() !== target.email.toLowerCase()) {
    throw new AppError("CONFIRM_EMAIL", 400, "Type the account's email address to confirm the deletion.");
  }

  const paid = await prisma.eventRegistration.count({
    where: { userId: target.id, status: { in: ["CONFIRMED", "CHECKED_IN"] }, totalFee: { gt: 0 } },
  });
  if (paid > 0) {
    throw new AppError(
      "HAS_PAYMENTS",
      409,
      "This member has a confirmed paid registration, and that payment record must be kept. Disable the account instead."
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Likes on other people's posts: take them off those posts' counts.
    const likes = await tx.postLike.findMany({ where: { userId: target.id }, select: { postId: true } });
    for (const { postId } of likes) {
      await tx.post.updateMany({ where: { id: postId, likesCount: { gt: 0 } }, data: { likesCount: { decrement: 1 } } });
    }
    await tx.postLike.deleteMany({ where: { userId: target.id } });
    const comments = await tx.comment.findMany({ where: { authorId: target.id }, select: { postId: true } });
    for (const { postId } of comments) {
      await tx.post.updateMany({ where: { id: postId, commentsCount: { gt: 0 } }, data: { commentsCount: { decrement: 1 } } });
    }
    await tx.comment.deleteMany({ where: { authorId: target.id } });
    await tx.post.deleteMany({ where: { authorId: target.id } }); // their comments and likes go with them
    await tx.message.deleteMany({ where: { OR: [{ senderId: target.id }, { receiverId: target.id }] } });
    const registrations = await tx.eventRegistration.deleteMany({ where: { userId: target.id } });
    const donations = await tx.donation.updateMany({ where: { userId: target.id }, data: { userId: null } });
    await tx.mentor.deleteMany({ where: { userId: target.id } }); // with requests to them
    await tx.mentorshipRequest.deleteMany({ where: { menteeUserId: target.id } });
    await tx.job.deleteMany({ where: { postedById: target.id } }); // with applications to them
    await tx.jobApplication.deleteMany({ where: { applicantUserId: target.id } });
    await tx.volunteer.deleteMany({ where: { userId: target.id } });
    await tx.user.delete({ where: { id: target.id } }); // profile, notifications, verification requests
    return { registrations: registrations.count, donationsKept: donations.count };
  });

  // Files last: a failed delete above leaves them in place.
  const dirs = [target.profile?.avatarUrl, target.profile?.avatarOriginalUrl, ...target.verificationRequests.map((v) => v.proofFileUrl)]
    .map(mediaDir)
    .filter((d): d is string => d !== null);
  for (const dir of new Set(dirs)) await removeAvatarDir(dir);

  console.info(`[admin-users] ${actor.email} deleted ${target.email}`);
  return { id: target.id, email: target.email, name: target.profile?.fullName || target.email, ...result };
}
