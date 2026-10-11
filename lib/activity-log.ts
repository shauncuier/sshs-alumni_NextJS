import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";

/**
 * The audit trail behind /admin/logs. Every meaningful action (sign-ins, joins,
 * verification codes, admin decisions, payments, SMS, profile changes, abuse
 * limits) is recorded with who did it, what it touched, the outcome, the IP and
 * the browser.
 *
 * Logging must never break or slow a request: logActivity swallows its own
 * errors. Secrets are never stored: metadata keys that look like passwords,
 * codes or tokens are replaced before writing, and message bodies are not logged.
 */

export const ACTIVITY_CATEGORIES = ["AUTH", "ACCOUNT", "VERIFY", "ADMIN", "EVENT", "PAYMENT", "SMS", "CONTENT", "SECURITY", "SYSTEM"] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];
export type ActivityStatus = "SUCCESS" | "FAILURE";

export type ActivityActor = { id?: string | null; email?: string | null; role?: string | null } | null | undefined;

export interface ActivityInput {
  category: ActivityCategory;
  /** Short machine name, e.g. "user.role_changed". */
  action: string;
  summary: string;
  status?: ActivityStatus;
  actor?: ActivityActor;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  /** The incoming request, for IP and browser. */
  req?: Request | null;
  /** For callers without a Request (NextAuth's authorize gets plain headers). */
  ip?: string | null;
  userAgent?: string | null;
}

// Keys whose values are never stored: any key containing one of these, or named exactly like the second list.
const SECRET_PARTS = ["password", "secret", "token", "otp", "challenge", "apikey", "api_key", "authorization", "cookie", "cvv", "cardnumber"];
const SECRET_NAMES = new Set(["code", "pin", "hash", "pass", "passwordhash"]);
export function isSecretKey(key: string): boolean {
  const k = key.toLowerCase();
  return SECRET_NAMES.has(k) || SECRET_PARTS.some((part) => k.includes(part));
}
const MAX_STRING = 500;

/** Copies metadata without secrets, cutting long strings and deep nesting. */
export function scrubMetadata(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (depth >= 3) return "[…]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => scrubMetadata(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
      out[key] = isSecretKey(key) ? "[redacted]" : scrubMetadata(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

function requestContext(req?: Request | null): { ip: string | null; userAgent: string | null } {
  if (!req) return { ip: null, userAgent: null };
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = req.headers.get("user-agent");
  return { ip: ip?.slice(0, 64) ?? null, userAgent: userAgent?.slice(0, 255) ?? null };
}

const cut = (value: string | null | undefined, max: number) => (value ? value.slice(0, max) : null);

export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    const fromReq = requestContext(input.req);
    const ip = cut(input.ip ?? fromReq.ip, 64);
    const userAgent = cut(input.userAgent ?? fromReq.userAgent, 255);
    await prisma.activityLog.create({
      data: {
        category: input.category,
        action: input.action.slice(0, 60),
        status: input.status ?? "SUCCESS",
        actorId: cut(input.actor?.id, 36),
        actorEmail: cut(input.actor?.email?.toLowerCase(), 255),
        actorRole: cut(input.actor?.role, 20),
        targetType: cut(input.targetType, 40),
        targetId: cut(input.targetId, 191),
        summary: input.summary.slice(0, 500),
        metadata: input.metadata ? (scrubMetadata(input.metadata) as Prisma.InputJsonValue) : undefined,
        ip,
        userAgent,
      },
    });
  } catch (err) {
    console.error("[activity-log] Could not record", input.action, err instanceof Error ? err.message : err);
  }
}

/**
 * Logs a failed request when the failure says something about security or misuse
 * (forbidden, signed out, rate limited, bad verification code). Ordinary
 * validation errors are not logged.
 */
export async function logFailure(err: unknown, input: Omit<ActivityInput, "status" | "summary"> & { summary?: string }): Promise<void> {
  if (!(err instanceof AppError)) return;
  const securityRelevant = err.status === 401 || err.status === 403 || err.status === 429 || err.code.startsWith("OTP_") || err.code.endsWith("NOT_VERIFIED");
  if (!securityRelevant) return;
  await logActivity({
    ...input,
    category: err.status === 429 ? "SECURITY" : input.category,
    status: "FAILURE",
    summary: input.summary ?? err.message,
    metadata: { ...input.metadata, errorCode: err.code, httpStatus: err.status },
  });
}

export interface ActivityQuery {
  q?: string | null;
  category?: string | null;
  status?: string | null;
  actorId?: string | null;
  page?: number;
}

export const ACTIVITY_PAGE_SIZE = 50;

export async function listActivity(query: ActivityQuery) {
  const where: Prisma.ActivityLogWhereInput = {};
  if (query.category && (ACTIVITY_CATEGORIES as readonly string[]).includes(query.category)) where.category = query.category;
  if (query.status === "SUCCESS" || query.status === "FAILURE") where.status = query.status;
  if (query.actorId) where.actorId = query.actorId;
  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { summary: { contains: q } },
      { action: { contains: q } },
      { actorEmail: { contains: q } },
      { targetId: { contains: q } },
      { ip: { contains: q } },
    ];
  }
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const [entries, total] = await Promise.all([
    prisma.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * ACTIVITY_PAGE_SIZE, take: ACTIVITY_PAGE_SIZE }),
    prisma.activityLog.count({ where }),
  ]);
  return {
    entries: entries.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
    total,
    page,
    pageSize: ACTIVITY_PAGE_SIZE,
  };
}

/** Deletes entries older than LOG_RETENTION_DAYS (default 365). Returns how many. */
export async function pruneActivityLog(now = new Date()): Promise<number> {
  const days = Number(process.env.LOG_RETENTION_DAYS) || 365;
  const before = new Date(now.getTime() - days * 24 * 60 * 60_000);
  const { count } = await prisma.activityLog.deleteMany({ where: { createdAt: { lt: before } } });
  return count;
}
