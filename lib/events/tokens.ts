import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { generateQrDataUrl } from "@/lib/id-card";
import { openJson, sealJson } from "@/lib/sealed-token";
import { TOKEN_KINDS, TOKEN_QR_PREFIX, tokenKind, type TokenKind } from "./token-kinds";

/**
 * Single-use food and kit tokens for an event day. A confirmed registration gets one
 * token per meal per person (headCount) and one T-shirt and gift kit token. Tokens are
 * printed by admins (/admin/events/[id]/print?what=tokens) and scanned once at a food
 * counter in the gate app (/gate, counter mode).
 */

export { TOKEN_KINDS, TOKEN_QR_PREFIX, isTokenKind, tokenKind, type TokenKind } from "./token-kinds";

/** Most tokens built in one print (each needs a QR code). */
export const MAX_TOKENS_PER_PRINT = 1500;

// Its own purpose: a ticket or a membership card can never be read as a token, nor the reverse.
const TOKEN_PURPOSE = "ssghs-event-token-v1";

export function createTokenCode(tokenId: string): string {
  return `${TOKEN_QR_PREFIX}${sealJson(TOKEN_PURPOSE, { t: tokenId })}`;
}

/** The token id in a scanned code, or null for anything that is not a genuine token. */
export function readTokenCode(scan: string): string | null {
  const raw = scan.trim();
  const token = raw.startsWith(TOKEN_QR_PREFIX) ? raw.slice(TOKEN_QR_PREFIX.length) : raw;
  const opened = openJson<{ t?: unknown }>(TOKEN_PURPOSE, token);
  return opened.ok && typeof opened.value.t === "string" ? opened.value.t : null;
}

type Db = Prisma.TransactionClient | typeof prisma;

/** Creates the tokens a confirmed registration should have and does not yet (reprints reuse them). */
export async function ensureTokens(registrationId: string, db: Db = prisma): Promise<void> {
  const reg = await db.eventRegistration.findUnique({ where: { id: registrationId }, select: { status: true, headCount: true } });
  if (!reg || (reg.status !== "CONFIRMED" && reg.status !== "CHECKED_IN")) return;
  const people = Math.max(1, reg.headCount);
  const data = TOKEN_KINDS.flatMap((k) =>
    Array.from({ length: k.perPerson ? people : 1 }, (_, i) => ({ registrationId, kind: k.key, person: i + 1 }))
  );
  await db.eventToken.createMany({ data, skipDuplicates: true });
}

export interface PrintableToken {
  id: string;
  kind: TokenKind;
  person: number;
  people: number;
  name: string;
  batch: number | null;
  slipNo: string;
  qrDataUrl: string;
}

/** "SSG-1A2B3C4D": the short number printed on a registration's slip and tokens. */
export function slipNumber(registrationId: string): string {
  return `SSG-${registrationId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/**
 * Tokens to print for an event's confirmed registrations (or one of them), by batch then
 * name, each registration's tokens together. Throws when there would be too many.
 */
export async function tokensForPrint(
  eventId: string,
  opts: { registrationId?: string | null; batch?: number | null; source?: string | null } = {}
): Promise<PrintableToken[]> {
  const regs = await prisma.eventRegistration.findMany({
    where: {
      eventId,
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
      ...(opts.registrationId ? { id: opts.registrationId } : {}),
      ...(opts.batch ? { user: { profile: { is: { sscBatch: opts.batch } } } } : {}),
      ...(opts.source ? { source: opts.source } : {}),
    },
    select: { id: true, headCount: true, user: { select: { email: true, profile: { select: { fullName: true, sscBatch: true } } } } },
  });
  const expected = regs.reduce((n, r) => n + Math.max(1, r.headCount) * 3 + 1, 0);
  if (expected > MAX_TOKENS_PER_PRINT) {
    throw Object.assign(new Error(`That is ${expected} tokens; print at most ${MAX_TOKENS_PER_PRINT} at a time (one batch or one registration).`), {
      code: "TOO_MANY",
    });
  }
  for (const r of regs) await ensureTokens(r.id);
  regs.sort(
    (a, b) =>
      (a.user.profile?.sscBatch ?? 0) - (b.user.profile?.sscBatch ?? 0) ||
      (a.user.profile?.fullName ?? a.user.email).localeCompare(b.user.profile?.fullName ?? b.user.email)
  );
  const tokens = await prisma.eventToken.findMany({ where: { registrationId: { in: regs.map((r) => r.id) } } });
  const order = (k: string) => TOKEN_KINDS.findIndex((t) => t.key === k);
  const out: PrintableToken[] = [];
  for (const r of regs) {
    const mine = tokens.filter((t) => t.registrationId === r.id).sort((a, b) => order(a.kind) - order(b.kind) || a.person - b.person);
    for (const t of mine) {
      out.push({
        id: t.id,
        kind: t.kind as TokenKind,
        person: t.person,
        people: Math.max(1, r.headCount),
        name: r.user.profile?.fullName ?? r.user.email,
        batch: r.user.profile?.sscBatch ?? null,
        slipNo: slipNumber(r.id),
        qrDataUrl: await generateQrDataUrl(createTokenCode(t.id), "M"),
      });
    }
  }
  return out;
}

export type RedeemResult =
  | { ok: true; name: string; batch: number | null; kind: TokenKind; person: number; people: number }
  | {
      ok: false;
      reason: "INVALID" | "WRONG_EVENT" | "WRONG_COUNTER" | "PENDING_PAYMENT" | "CANCELLED" | "ALREADY_USED";
      message: string;
    };

function dhakaTime(d: Date): string {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });
}

/**
 * Serves a scanned token exactly once. `kind` is the counter the volunteer runs: a lunch
 * token is refused at the breakfast counter. With `eventId`, another event's token is refused.
 */
export async function redeemToken(
  scan: string,
  staffEmail: string,
  opts: { eventId?: string | null; kind: TokenKind },
  now = new Date()
): Promise<RedeemResult> {
  const tokenId = readTokenCode(scan);
  if (!tokenId) return { ok: false, reason: "INVALID", message: "This is not a valid food or kit token." };

  return prisma.$transaction(async (tx) => {
    const token = await tx.eventToken.findUnique({
      where: { id: tokenId },
      include: { registration: { include: { event: { select: { id: true, title: true } }, user: { include: { profile: true } } } } },
    });
    if (!token) return { ok: false, reason: "INVALID", message: "This token no longer exists." } as const;
    const reg = token.registration;
    if (opts.eventId && reg.eventId !== opts.eventId) {
      return { ok: false, reason: "WRONG_EVENT", message: `This token is for another event: ${reg.event.title}.` } as const;
    }
    if (token.kind !== opts.kind) {
      const k = tokenKind(token.kind);
      return { ok: false, reason: "WRONG_COUNTER", message: `This is a ${k?.en ?? token.kind} token (${k?.bn ?? ""}).` } as const;
    }
    if (reg.status === "PENDING_PAYMENT") return { ok: false, reason: "PENDING_PAYMENT", message: "Payment not confirmed." } as const;
    if (reg.status === "CANCELLED") return { ok: false, reason: "CANCELLED", message: "Registration cancelled." } as const;
    if (token.usedAt) {
      return { ok: false, reason: "ALREADY_USED", message: `Already used at ${dhakaTime(token.usedAt)}${token.usedBy ? ` (${token.usedBy})` : ""}.` } as const;
    }
    // Conditional update: two counters scanning the same token at once cannot both serve it.
    const { count } = await tx.eventToken.updateMany({ where: { id: token.id, usedAt: null }, data: { usedAt: now, usedBy: staffEmail } });
    if (count === 0) return { ok: false, reason: "ALREADY_USED", message: "Already used." } as const;
    return {
      ok: true,
      name: reg.user.profile?.fullName ?? reg.user.email,
      batch: reg.user.profile?.sscBatch ?? null,
      kind: token.kind as TokenKind,
      person: token.person,
      people: Math.max(1, reg.headCount),
    } as const;
  });
}

/** Per kind: tokens served and tokens printed, for the gate's food counters. */
export async function tokenCounts(eventId: string): Promise<Record<TokenKind, { used: number; total: number }>> {
  const where = { registration: { eventId, status: { in: ["CONFIRMED", "CHECKED_IN"] as ("CONFIRMED" | "CHECKED_IN")[] } } };
  const [total, used] = await Promise.all([
    prisma.eventToken.groupBy({ by: ["kind"], where, _count: { id: true } }),
    prisma.eventToken.groupBy({ by: ["kind"], where: { ...where, usedAt: { not: null } }, _count: { id: true } }),
  ]);
  return Object.fromEntries(
    TOKEN_KINDS.map((k) => [
      k.key,
      { used: used.find((r) => r.kind === k.key)?._count.id ?? 0, total: total.find((r) => r.kind === k.key)?._count.id ?? 0 },
    ])
  ) as Record<TokenKind, { used: number; total: number }>;
}

/** Per registration and kind: "used of total", for the admin attendee list. */
export async function tokenUsageByRegistration(eventId: string): Promise<Record<string, Partial<Record<TokenKind, { used: number; total: number }>>>> {
  const rows = await prisma.eventToken.findMany({
    where: { registration: { eventId } },
    select: { registrationId: true, kind: true, usedAt: true },
  });
  const out: Record<string, Partial<Record<TokenKind, { used: number; total: number }>>> = {};
  for (const r of rows) {
    const k = r.kind as TokenKind;
    const entry = ((out[r.registrationId] ??= {})[k] ??= { used: 0, total: 0 });
    entry.total += 1;
    if (r.usedAt) entry.used += 1;
  }
  return out;
}
