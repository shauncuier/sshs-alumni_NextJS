/**
 * Site-wide switches for the unread-message reminders (lib/message-reminders.ts): the
 * email and the SMS a member gets when a direct message is still unread after an hour.
 * Both are on until an admin turns one off in Admin → Settings; every change is logged.
 * Each member can also turn their own off in Settings.
 */
import prisma from "@/lib/prisma";

const KEY = "message-reminders";

export interface MessageReminderSetting {
  sms: boolean;
  email: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function getMessageReminderSetting(): Promise<MessageReminderSetting> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  let stored: { sms?: unknown; email?: unknown } = {};
  try {
    stored = row ? JSON.parse(row.value) : {};
  } catch {
    // A damaged value keeps both on.
  }
  return {
    sms: stored.sms !== false,
    email: stored.email !== false,
    updatedAt: row?.updatedAt.toISOString() ?? null,
    updatedBy: row?.updatedBy ?? null,
  };
}

/** The switches for one run of the reminders; both on if the setting cannot be read. */
export async function messageRemindersOn(): Promise<{ sms: boolean; email: boolean }> {
  try {
    const { sms, email } = await getMessageReminderSetting();
    return { sms, email };
  } catch {
    return { sms: true, email: true };
  }
}

export async function setMessageReminderSetting(next: { sms: boolean; email: boolean }, adminEmail: string): Promise<MessageReminderSetting> {
  const value = JSON.stringify({ sms: next.sms, email: next.email });
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value, updatedBy: adminEmail },
    update: { value, updatedBy: adminEmail },
  });
  return getMessageReminderSetting();
}
