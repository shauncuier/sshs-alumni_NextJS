import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * The member network: verified members only, searchable by name, profession,
 * company or city and filterable by SSC batch. Phone and email are included only
 * when the member made them public. Also gives messaging the name and photo of
 * the people in a conversation.
 */

export const NETWORK_PAGE_SIZE = 24;

export interface NetworkMember {
  userId: string;
  profileId: string;
  fullName: string;
  sscBatch: number;
  profession: string;
  company: string | null;
  locationCity: string;
  locationCountry: string;
  avatarUrl: string;
  phone: string | null;
  email: string | null;
}

/** A member as shown in a message thread. */
export interface MemberBasics {
  userId: string;
  profileId: string | null;
  fullName: string;
  sscBatch: number | null;
  avatarUrl: string;
}

const initialsAvatar = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=06281e&color=fcd34d&bold=true`;
const photo = (url: string | null | undefined, name: string) => (url && url !== "/logo.png" ? url : initialsAvatar(name));

/** Members who may appear in the network and receive messages: verified, or staff, and not disabled. */
export const ACTIVE_MEMBER: Prisma.UserWhereInput = {
  disabledAt: null,
  OR: [{ status: "VERIFIED" }, { role: { in: ["ADMIN", "SUPER_ADMIN", "MODERATOR"] } }],
};

export async function searchMembers(args: { viewerId: string; q?: string | null; batch?: string | null; page?: number }) {
  const q = args.q?.trim().slice(0, 100) ?? "";
  const where: Prisma.AlumniProfileWhereInput = {
    userId: { not: args.viewerId },
    verificationStatus: "VERIFIED",
    user: { status: "VERIFIED", disabledAt: null },
  };
  const batch = Number(args.batch);
  if (args.batch && Number.isInteger(batch)) where.sscBatch = batch;
  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { profession: { contains: q } },
      { company: { contains: q } },
      { locationCity: { contains: q } },
    ];
  }
  const page = Math.max(1, Math.floor(args.page ?? 1));
  const [rows, total, batches] = await Promise.all([
    prisma.alumniProfile.findMany({
      where,
      orderBy: [{ sscBatch: "desc" }, { fullName: "asc" }],
      skip: (page - 1) * NETWORK_PAGE_SIZE,
      take: NETWORK_PAGE_SIZE,
      select: {
        id: true,
        userId: true,
        fullName: true,
        sscBatch: true,
        profession: true,
        company: true,
        locationCity: true,
        locationCountry: true,
        avatarUrl: true,
        phone: true,
        isPhonePublic: true,
        isEmailPublic: true,
        user: { select: { email: true } },
      },
    }),
    prisma.alumniProfile.count({ where }),
    prisma.alumniProfile.findMany({
      where: { verificationStatus: "VERIFIED", user: { status: "VERIFIED", disabledAt: null } },
      distinct: ["sscBatch"],
      select: { sscBatch: true },
      orderBy: { sscBatch: "desc" },
    }),
  ]);
  const members: NetworkMember[] = rows.map((p) => ({
    userId: p.userId,
    profileId: p.id,
    fullName: p.fullName,
    sscBatch: p.sscBatch,
    profession: p.profession,
    company: p.company,
    locationCity: p.locationCity,
    locationCountry: p.locationCountry,
    avatarUrl: photo(p.avatarUrl, p.fullName),
    phone: p.isPhonePublic ? p.phone : null,
    email: p.isEmailPublic ? p.user.email : null,
  }));
  return { members, total, page, pageSize: NETWORK_PAGE_SIZE, batches: batches.map((b) => b.sscBatch) };
}

export async function memberBasics(userIds: string[]): Promise<Map<string, MemberBasics>> {
  const unique = Array.from(new Set(userIds)).filter(Boolean);
  if (unique.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, email: true, profile: { select: { id: true, fullName: true, sscBatch: true, avatarUrl: true } } },
  });
  return new Map(
    users.map((u) => {
      const name = u.profile?.fullName || u.email.split("@")[0];
      return [u.id, { userId: u.id, profileId: u.profile?.id ?? null, fullName: name, sscBatch: u.profile?.sscBatch ?? null, avatarUrl: photo(u.profile?.avatarUrl, name) }];
    })
  );
}

/** True when `userId` is an active member who can receive messages. */
export async function canReceiveMessages(userId: string): Promise<boolean> {
  return (await prisma.user.count({ where: { id: userId, ...ACTIVE_MEMBER } })) > 0;
}
