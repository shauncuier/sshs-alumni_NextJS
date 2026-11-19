/**
 * Database watchdog. The live host has several times dropped the database user's
 * privileges on its own (MySQL error 1142, "SELECT command denied"): every page that
 * reads the database then fails until someone re-applies them in hPanel → Databases →
 * Change Permissions → Update. This notices it within minutes and tells the people who
 * can fix it, by email and SMS, without needing the database:
 *
 * - every few minutes (instrumentation.ts) one real table is read;
 * - two failed checks in a row raise an alert, at most once an hour across all server
 *   processes (a marker file under UPLOADS_DIR decides which process sends it);
 * - when the database answers again after an alert, one "it is back" email follows;
 * - who to tell is saved to a file while the database works (the super admin's email and
 *   mobile number, the registration-alert emails), since it cannot be read during an
 *   outage. DB_ALERT_EMAILS / DB_ALERT_PHONES (comma-separated) add more.
 *
 * GET /api/health uses the same check for an outside uptime monitor.
 */
import fs from "node:fs/promises";
import path from "node:path";
import prisma from "@/lib/prisma";
import { isValidBdMobile, normalizeBdPhoneNumber, sendBulkSms } from "@/lib/bulksmsbd";
import { sendEmail } from "@/lib/email";
import { renderEmail, siteUrl } from "@/lib/email-templates";
import { uploadsRoot } from "@/lib/media/avatars";

export type DbStatus = { ok: true } | { ok: false; reason: "permission" | "down"; detail: string };

/** One real read of a table: `SELECT 1` would pass even without table privileges. */
export async function checkDatabase(): Promise<DbStatus> {
  try {
    await prisma.user.findFirst({ select: { id: true } });
    return { ok: true };
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err);
    const permission = /\b1142\b|command denied/i.test(text);
    return { ok: false, reason: permission ? "permission" : "down", detail: text.replace(/\s+/g, " ").slice(0, 300) };
  }
}

export interface Recipients {
  emails: string[];
  phones: string[];
}

export function watchdogDir(): string {
  return path.join(uploadsRoot(), ".db-watchdog");
}

function splitList(v: string | undefined): string[] {
  return (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/** Who gets the alert, read while the database works and saved to a file for an outage. */
export async function refreshRecipients(dir = watchdogDir()): Promise<Recipients> {
  const emails = new Set<string>();
  const phones = new Set<string>();
  const superEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (superEmail) {
    emails.add(superEmail);
    const admin = await prisma.user.findUnique({ where: { email: superEmail }, select: { profile: { select: { phone: true } } } });
    if (admin?.profile?.phone) phones.add(admin.profile.phone);
  }
  const { getRegistrationAlertSetting } = await import("@/lib/registration-alerts");
  for (const e of (await getRegistrationAlertSetting()).emails) emails.add(e);
  const saved: Recipients = { emails: [...emails], phones: [...phones] };
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "recipients.json"), JSON.stringify(saved));
  return saved;
}

/** The saved recipients plus DB_ALERT_EMAILS / DB_ALERT_PHONES; never needs the database. */
export async function alertRecipients(dir = watchdogDir()): Promise<Recipients> {
  let saved: Recipients = { emails: [], phones: [] };
  try {
    saved = JSON.parse(await fs.readFile(path.join(dir, "recipients.json"), "utf8"));
  } catch {
    // Not saved yet: the env lists and the super admin's address still work.
  }
  const emails = new Set([...(saved.emails ?? []), ...splitList(process.env.DB_ALERT_EMAILS)].map((e) => e.toLowerCase()));
  const superEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (superEmail) emails.add(superEmail);
  const phones = new Set<string>();
  for (const p of [...(saved.phones ?? []), ...splitList(process.env.DB_ALERT_PHONES)]) {
    const n = normalizeBdPhoneNumber(p);
    if (n && isValidBdMobile(n)) phones.add(n);
  }
  return { emails: [...emails], phones: [...phones] };
}

/** Claims a one-off marker file; true only for the first process to ask. */
async function claim(dir: string, name: string): Promise<boolean> {
  await fs.mkdir(dir, { recursive: true });
  try {
    const handle = await fs.open(path.join(dir, name), "wx");
    await handle.close();
    return true;
  } catch {
    return false;
  }
}

const FIX_STEPS = "hPanel → Websites → exsabujian.org → Databases → Management → ⋮ → Change Permissions → Update. If some pages still fail after a minute, Deployments → Redeploy.";

export function alertSms(reason: "permission" | "down"): string {
  return reason === "permission"
    ? "ExSabujian ALERT: website lost database access (error 1142). Fix: hPanel > Databases > Change Permissions > Update."
    : "ExSabujian ALERT: website cannot reach its database. Check hPanel > Databases and the runtime logs.";
}

function alertEmail(status: Extract<DbStatus, { ok: false }>, at: Date) {
  return renderEmail({
    subject: status.reason === "permission" ? "ALERT: the website lost access to its database" : "ALERT: the website cannot reach its database",
    preheader: "Pages that read the database are failing for visitors.",
    heading: status.reason === "permission" ? "The website lost access to its database" : "The website cannot reach its database",
    paragraphs: [
      `Since about ${at.toISOString().replace("T", " ").slice(0, 16)} UTC, pages that read the database (events, registration, the directory, the admin panel) fail for visitors.`,
      status.reason === "permission"
        ? `The host has removed the database user's permissions again (MySQL error 1142). To fix it: ${FIX_STEPS}`
        : "The database did not answer. Check hPanel → Databases and the website's runtime logs.",
    ],
    quote: status.detail,
    button: { label: "Open the live site", url: siteUrl("/") },
    note: "Sent by the website's database watchdog, at most once an hour while the problem lasts. Another email follows when it works again.",
  });
}

function recoveredEmail(at: Date) {
  return renderEmail({
    subject: "Resolved: the website can read its database again",
    preheader: "The database works again.",
    heading: "The database works again",
    paragraphs: [`At ${at.toISOString().replace("T", " ").slice(0, 16)} UTC the website could read its database again. No action needed.`],
    note: "Sent by the website's database watchdog.",
  });
}

export interface WatchdogState {
  failures: number;
}

export const ALERT_AFTER_FAILURES = 2;

export interface WatchdogDeps {
  check?: () => Promise<DbStatus>;
  dir?: string;
  now?: Date;
}

/** One watchdog round. Returns what it did; never throws. */
export async function runDbWatchdog(state: WatchdogState, deps: WatchdogDeps = {}): Promise<"ok" | "failing" | "alerted" | "recovered"> {
  const dir = deps.dir ?? watchdogDir();
  const now = deps.now ?? new Date();
  try {
    const status = await (deps.check ?? checkDatabase)();
    if (status.ok) {
      state.failures = 0;
      // Remember who to tell, at most once an hour.
      if (await claim(dir, `recipients-${now.toISOString().slice(0, 13)}`)) await refreshRecipients(dir).catch(() => undefined);
      // An alert went out: say it is resolved, once.
      const alerted = path.join(dir, "outage");
      try {
        await fs.unlink(alerted);
      } catch {
        return "ok";
      }
      const to = (await alertRecipients(dir)).emails;
      for (const email of to) await sendEmail({ to: email, ...recoveredEmail(now) }).catch(() => undefined);
      console.info("[db-watchdog] Database works again; recovery email sent.");
      return "recovered";
    }

    state.failures += 1;
    console.error(`[db-watchdog] Database check failed (${status.reason}, ${state.failures} in a row): ${status.detail}`);
    if (state.failures < ALERT_AFTER_FAILURES) return "failing";
    // One alert per hour, whichever server process gets there first.
    if (!(await claim(dir, `alert-${now.toISOString().slice(0, 13)}`))) return "failing";
    await fs.writeFile(path.join(dir, "outage"), now.toISOString());
    const { emails, phones } = await alertRecipients(dir);
    const mail = alertEmail(status, now);
    for (const email of emails) await sendEmail({ to: email, ...mail }).catch(() => undefined);
    if (phones.length) await sendBulkSms({ numbers: phones, message: alertSms(status.reason) }).catch(() => undefined);
    console.error(`[db-watchdog] Alert sent to ${emails.length} email(s) and ${phones.length} phone(s).`);
    return "alerted";
  } catch (err) {
    console.error("[db-watchdog] Watchdog round failed:", err instanceof Error ? err.message : err);
    return "failing";
  }
}

/** Deletes marker files older than two days so the folder stays small. */
export async function pruneWatchdogMarkers(dir = watchdogDir(), now = Date.now()): Promise<void> {
  try {
    for (const name of await fs.readdir(dir)) {
      if (!/^(alert|recipients)-/.test(name)) continue;
      const file = path.join(dir, name);
      const { mtimeMs } = await fs.stat(file);
      if (now - mtimeMs > 2 * 24 * 60 * 60_000) await fs.unlink(file);
    }
  } catch {
    // Nothing to tidy.
  }
}
