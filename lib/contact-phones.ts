/**
 * The association's contact phone numbers, stored as a Setting so admins can change
 * them (Admin → Settings → Contact numbers). See lib/contact-phones-shared.ts.
 */
import prisma from "@/lib/prisma";
import { DEFAULT_CONTACT_PHONES, normalizeContactPhones, type ContactPhone } from "@/lib/contact-phones-shared";

const KEY = "contact-phones";

export interface ContactPhonesSetting {
  phones: ContactPhone[];
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function getContactPhonesSetting(): Promise<ContactPhonesSetting> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  let phones = DEFAULT_CONTACT_PHONES;
  if (row) {
    try {
      phones = normalizeContactPhones(JSON.parse(row.value));
    } catch {
      // A damaged value: show the defaults rather than nothing.
    }
  }
  return { phones, updatedAt: row?.updatedAt.toISOString() ?? null, updatedBy: row?.updatedBy ?? null };
}

/** The numbers to show; the defaults if the setting cannot be read. */
export async function getContactPhones(): Promise<ContactPhone[]> {
  try {
    return (await getContactPhonesSetting()).phones;
  } catch {
    return DEFAULT_CONTACT_PHONES;
  }
}

export async function setContactPhones(input: unknown, adminEmail: string): Promise<ContactPhonesSetting> {
  const value = JSON.stringify(normalizeContactPhones(input));
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value, updatedBy: adminEmail },
    update: { value, updatedBy: adminEmail },
  });
  return getContactPhonesSetting();
}
