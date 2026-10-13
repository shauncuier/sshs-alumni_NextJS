/**
 * Membership ID cards: the data printed on a card and its gate QR code. Used by the
 * member's own card (/card, GET /api/alumni/card) and by the admin bulk print
 * (/admin/id-cards, /api/admin/id-cards), so both print the same card.
 */
import prisma from "@/lib/prisma";
import { initialsAvatar } from "@/lib/avatar";
import { createCardToken, generateAlumniId, generateQrDataUrl } from "@/lib/id-card";

/** How long a printed card's QR stays valid. */
const CARD_VALID_MS = 5 * 365 * 24 * 60 * 60 * 1000;
/** Most cards built in one bulk print request (each needs a QR code). */
export const MAX_CARDS_PER_PRINT = 200;

export interface MemberCard {
  userId: string;
  alumniId: string;
  fullName: string;
  sscBatch: number;
  profession: string;
  avatarUrl: string;
  hasPhoto: boolean;
  status: string;
  issuedAt: number;
  expiresAt: number;
  verifyUrl: string;
  qrDataUrl: string;
}

type CardUser = {
  id: string;
  status: string;
  profile: { fullName: string; sscBatch: number; profession: string | null; avatarUrl: string | null } | null;
};

/** One member's card, with a freshly signed gate QR. Null when they have no profile yet. */
export async function buildMemberCard(user: CardUser, origin: string): Promise<MemberCard | null> {
  const p = user.profile;
  if (!p) return null;
  const alumniId = generateAlumniId(p.sscBatch, user.id);
  const issuedAt = Date.now();
  const expiresAt = issuedAt + CARD_VALID_MS;
  const token = createCardToken({
    alumniId,
    userId: user.id,
    fullName: p.fullName,
    sscBatch: p.sscBatch,
    profession: p.profession ?? "",
    membershipTier: "LIFETIME",
    issuedAt,
    expiresAt,
  });
  const verifyUrl = `${origin}/verify/${token}`;
  return {
    userId: user.id,
    alumniId,
    fullName: p.fullName,
    sscBatch: p.sscBatch,
    profession: p.profession ?? "",
    avatarUrl: p.avatarUrl || initialsAvatar(p.fullName),
    hasPhoto: Boolean(p.avatarUrl),
    status: user.status,
    issuedAt,
    expiresAt,
    verifyUrl,
    qrDataUrl: await generateQrDataUrl(verifyUrl, "M"),
  };
}

const CARD_USER_SELECT = {
  id: true,
  status: true,
  profile: { select: { fullName: true, sscBatch: true, profession: true, avatarUrl: true } },
} as const;

/** Members a card may be printed for: approved, with an approved profile, not disabled. */
const PRINTABLE = {
  status: "VERIFIED",
  disabledAt: null,
  profile: { is: { verificationStatus: "VERIFIED" } },
} as const;

export interface CardCandidate {
  userId: string;
  fullName: string;
  sscBatch: number;
  profession: string;
  avatarUrl: string;
  hasPhoto: boolean;
}

/** Approved members for the bulk print list, by batch then name; optional batch and name/email search. */
export async function listCardCandidates(filter: { batch?: number | null; q?: string | null } = {}): Promise<CardCandidate[]> {
  const q = filter.q?.trim();
  const users = await prisma.user.findMany({
    where: {
      ...PRINTABLE,
      profile: { is: { verificationStatus: "VERIFIED", ...(filter.batch ? { sscBatch: filter.batch } : {}) } },
      ...(q ? { OR: [{ email: { contains: q } }, { profile: { is: { fullName: { contains: q } } } }] } : {}),
    },
    select: CARD_USER_SELECT,
    take: 2000,
  });
  return users
    .filter((u) => u.profile)
    .map((u) => ({
      userId: u.id,
      fullName: u.profile!.fullName,
      sscBatch: u.profile!.sscBatch,
      profession: u.profile!.profession ?? "",
      avatarUrl: u.profile!.avatarUrl || initialsAvatar(u.profile!.fullName),
      hasPhoto: Boolean(u.profile!.avatarUrl),
    }))
    .sort((a, b) => a.sscBatch - b.sscBatch || a.fullName.localeCompare(b.fullName));
}

/** Cards for the chosen members (approved ones only), in batch then name order. */
export async function buildCardsFor(userIds: string[], origin: string): Promise<MemberCard[]> {
  const ids = [...new Set(userIds)].slice(0, MAX_CARDS_PER_PRINT);
  if (!ids.length) return [];
  const users = await prisma.user.findMany({ where: { id: { in: ids }, ...PRINTABLE }, select: CARD_USER_SELECT });
  const cards = (await Promise.all(users.map((u) => buildMemberCard(u, origin)))).filter((c): c is MemberCard => c !== null);
  return cards.sort((a, b) => a.sscBatch - b.sscBatch || a.fullName.localeCompare(b.fullName));
}
