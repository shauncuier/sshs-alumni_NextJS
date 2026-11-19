/**
 * How often the standby copy runs (lib/standby-sync.ts), set in Admin → Settings →
 * Database. Shorter means a fresher copy if the main database fails, but more work for
 * the main database (every run reads each table to find what changed).
 */
import prisma from "@/lib/prisma";

const KEY = "standby-sync";

export const STANDBY_SYNC_CHOICES = [2, 5, 10, 15, 30] as const;
export const DEFAULT_STANDBY_SYNC_MINUTES = 5;

export interface StandbySyncSetting {
  minutes: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

function valid(minutes: unknown): minutes is number {
  return typeof minutes === "number" && (STANDBY_SYNC_CHOICES as readonly number[]).includes(minutes);
}

export async function getStandbySyncSetting(): Promise<StandbySyncSetting> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  let stored: { minutes?: unknown } = {};
  try {
    stored = row ? JSON.parse(row.value) : {};
  } catch {
    // A damaged value falls back to the default.
  }
  return {
    minutes: valid(stored.minutes) ? stored.minutes : DEFAULT_STANDBY_SYNC_MINUTES,
    updatedAt: row?.updatedAt.toISOString() ?? null,
    updatedBy: row?.updatedBy ?? null,
  };
}

let lastKnown: number | null = null;

/** The interval for the scheduler; while the database cannot be read, the last value it saw (or the default). */
export async function standbySyncMinutes(): Promise<number> {
  try {
    lastKnown = (await getStandbySyncSetting()).minutes;
  } catch {
    // Keep the last value.
  }
  return lastKnown ?? DEFAULT_STANDBY_SYNC_MINUTES;
}

export async function setStandbySyncMinutes(minutes: number, adminEmail: string): Promise<StandbySyncSetting> {
  if (!valid(minutes)) throw new Error(`minutes must be one of ${STANDBY_SYNC_CHOICES.join(", ")}`);
  const value = JSON.stringify({ minutes });
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value, updatedBy: adminEmail },
    update: { value, updatedBy: adminEmail },
  });
  lastKnown = minutes;
  return getStandbySyncSetting();
}
