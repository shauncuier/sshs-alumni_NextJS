/**
 * Email and SMS reminders about direct messages still unread an hour after they arrived.
 *
 * - One reminder covers every unread message of the member at that moment.
 * - At most one reminder per member every 6 hours (User.lastMessageReminderAt).
 * - SMS only to a verified number (AlumniProfile.phoneVerifiedAt); others get the email.
 * - The member turns each off in Settings (User.messageEmailReminders / messageSmsReminders);
 *   admins switch each off for everyone (lib/message-reminders-setting.ts).
 * - Never the message text: only how many and from whom.
 *
 * Runs every few minutes inside the server (instrumentation.ts) and by hand with
 * `npm run messages:remind`. The hosting runs several server processes, so a member is
 * claimed in the database (a conditional update in a transaction) before anything is sent:
 * two runs at the same moment remind them once. Never throws.
 */
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { isValidBdMobile, normalizeBdPhoneNumber, sendBulkSms } from "@/lib/bulksmsbd";
import { sendEmail } from "@/lib/email";
import { renderEmail, siteUrl } from "@/lib/email-templates";
import { messageRemindersOn } from "@/lib/message-reminders-setting";
import { smsTestModeOn } from "@/lib/sms-test-mode";

export const REMIND_AFTER_MS = 60 * 60_000;
export const REMINDER_GAP_MS = 6 * 60 * 60_000;
/** Members handled in one run; the rest wait for the next run. */
const MAX_MEMBERS_PER_RUN = 200;
/** Reminder SMS per server process per day: a guard against runaway costs. */
export const MAX_REMINDER_SMS_PER_DAY = 300;
const SMS_MAX_CHARS = 160;

let smsDay = "";
let smsToday = 0;

/** For tests: forget today's SMS count. */
export function resetReminderSmsCount(): void {
  smsDay = "";
  smsToday = 0;
}

function takeSmsAllowance(now: Date): boolean {
  const day = now.toISOString().slice(0, 10);
  if (day !== smsDay) {
    smsDay = day;
    smsToday = 0;
  }
  if (smsToday >= MAX_REMINDER_SMS_PER_DAY) return false;
  smsToday += 1;
  return true;
}

/** A sender's name for the SMS: only plain Latin text keeps the SMS cheap (GSM-7), else "a member". */
function smsName(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  return n && /^[A-Za-z .'-]{1,40}$/.test(n) ? n : "a member";
}

/** "You have 2 unread messages from Rahim Uddin and 1 other", in one plain SMS (at most 160 characters). */
export function reminderSms(count: number, senders: string[]): string {
  const link = siteUrl("/messages");
  const first = smsName(senders[0]);
  const others = senders.length - 1;
  const from = others > 0 ? `${first} and ${others} other${others === 1 ? "" : "s"}` : first;
  const what = count === 1 ? "an unread message" : `${count} unread messages`;
  const full = `ExSabujian: You have ${what} from ${from}. Read: ${link}`;
  if (full.length <= SMS_MAX_CHARS) return full;
  return `ExSabujian: You have ${what}. Read: ${link}`.slice(0, SMS_MAX_CHARS);
}

function reminderEmail(count: number, senders: string[]) {
  const names = senders.slice(0, 3);
  const more = senders.length - names.length;
  const fromLine = names.join(", ") + (more > 0 ? ` and ${more} other${more === 1 ? "" : "s"}` : "");
  const what = count === 1 ? "an unread message" : `${count} unread messages`;
  return renderEmail({
    subject: `You have ${what} on the alumni site`,
    preheader: `From ${fromLine}.`,
    heading: `You have ${what}`,
    paragraphs: [`${fromLine} ${senders.length === 1 ? "has" : "have"} written to you on the প্রাক্তন সবুজিয়ান পরিষদ site. Open your messages to read and reply.`],
    button: { label: "Open messages", url: siteUrl("/messages") },
    note: "You get this when a message is still unread after an hour, at most every 6 hours. Turn it off in Settings → Notifications.",
  });
}

class Skip extends Error {}

type Claimed = {
  userId: string;
  email: string;
  phone: string | null;
  phoneVerified: boolean;
  wantsEmail: boolean;
  wantsSms: boolean;
  count: number;
  senders: string[];
};

/** Claims one member's due messages, or returns null when another run has them or the 6-hour gap is not over. */
async function claim(userId: string, now: Date): Promise<Claimed | null> {
  const cutoff = new Date(now.getTime() - REMIND_AFTER_MS);
  const gapStart = new Date(now.getTime() - REMINDER_GAP_MS);
  try {
    return await prisma.$transaction(async (tx) => {
      const won = await tx.user.updateMany({
        where: { id: userId, OR: [{ lastMessageReminderAt: null }, { lastMessageReminderAt: { lt: gapStart } }] },
        data: { lastMessageReminderAt: now },
      });
      if (won.count === 0) throw new Skip();
      const due = { receiverId: userId, isRead: false, remindedAt: null, createdAt: { lte: cutoff } };
      const messages = await tx.message.findMany({ where: due, select: { id: true, senderId: true }, orderBy: { createdAt: "desc" } });
      if (messages.length === 0) throw new Skip();
      await tx.message.updateMany({ where: { id: { in: messages.map((m) => m.id) } }, data: { remindedAt: now } });

      const senderIds = [...new Set(messages.map((m) => m.senderId))];
      const [user, senders] = await Promise.all([
        tx.user.findUnique({
          where: { id: userId },
          select: { email: true, messageEmailReminders: true, messageSmsReminders: true, profile: { select: { phone: true, phoneVerifiedAt: true } } },
        }),
        tx.user.findMany({ where: { id: { in: senderIds } }, select: { id: true, email: true, profile: { select: { fullName: true } } } }),
      ]);
      if (!user) throw new Skip();
      const nameOf = (id: string) => {
        const s = senders.find((x) => x.id === id);
        return s?.profile?.fullName || "A member";
      };
      return {
        userId,
        email: user.email,
        phone: user.profile?.phone ?? null,
        phoneVerified: Boolean(user.profile?.phoneVerifiedAt),
        wantsEmail: user.messageEmailReminders,
        wantsSms: user.messageSmsReminders,
        count: messages.length,
        senders: senderIds.map(nameOf),
      };
    });
  } catch (err) {
    if (err instanceof Skip) return null;
    throw err;
  }
}

export interface ReminderRun {
  remindedMembers: number;
  emails: number;
  sms: number;
}

/** Reminds every member with messages unread for over an hour (see the top of this file). Never throws. */
export async function runMessageReminders(now = new Date()): Promise<ReminderRun> {
  const run: ReminderRun = { remindedMembers: 0, emails: 0, sms: 0 };
  try {
    const switches = await messageRemindersOn();
    if (!switches.email && !switches.sms) return run;
    const due = await prisma.message.groupBy({
      by: ["receiverId"],
      where: { isRead: false, remindedAt: null, createdAt: { lte: new Date(now.getTime() - REMIND_AFTER_MS) } },
      _count: { _all: true },
    });
    const testMode = switches.sms ? await smsTestModeOn() : false;
    for (const row of due.slice(0, MAX_MEMBERS_PER_RUN)) {
      let member: Claimed | null = null;
      try {
        member = await claim(row.receiverId, now);
      } catch (err) {
        console.warn(`[message-reminders] Could not claim a member (${(err as Error)?.name ?? "error"}).`);
      }
      if (!member) continue;
      run.remindedMembers += 1;

      let emailed = false;
      if (switches.email && member.wantsEmail && !/\.invalid$/i.test(member.email)) {
        try {
          emailed = (await sendEmail({ to: member.email, ...reminderEmail(member.count, member.senders) })).success;
        } catch {
          emailed = false;
        }
        if (emailed) run.emails += 1;
      }

      let texted: "sent" | "test-mode" | "failed" | "skipped" | "capped" = "skipped";
      const number = normalizeBdPhoneNumber(member.phone ?? "");
      if (switches.sms && member.wantsSms && member.phoneVerified && number && isValidBdMobile(number)) {
        const message = reminderSms(member.count, member.senders);
        if (testMode) {
          texted = "test-mode";
          await logActivity({ category: "SMS", action: "message.reminder_test_mode", summary: `Test mode: would text ${number}: "${message}"`, targetType: "User", targetId: member.userId });
        } else if (!takeSmsAllowance(now)) {
          texted = "capped";
          console.warn(`[message-reminders] Daily limit of ${MAX_REMINDER_SMS_PER_DAY} reminder SMS reached; the rest get email only.`);
        } else {
          try {
            texted = (await sendBulkSms({ numbers: [number], message })).success ? "sent" : "failed";
          } catch {
            texted = "failed";
          }
          if (texted === "sent") run.sms += 1;
        }
      }

      await logActivity({
        category: "SMS",
        action: "message.reminder_sent",
        summary: `Unread-message reminder (${member.count} message${member.count === 1 ? "" : "s"}): email ${emailed ? "sent" : "not sent"}, SMS ${texted}`,
        targetType: "User",
        targetId: member.userId,
        metadata: { messages: member.count, email: emailed, sms: texted },
      });
    }
  } catch (err) {
    console.warn(`[message-reminders] Run failed (${(err as Error)?.name ?? "error"}).`);
  }
  return run;
}
