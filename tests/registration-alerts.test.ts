import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "./helpers/db";
import { makeImage, makePdf } from "./helpers/images";
import { verifiedPhoneToken } from "./helpers/phone";

const mail = vi.hoisted(() => ({ sent: [] as { to: string; replyTo?: string; subject: string; html: string }[] }));
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...actual,
    sendEmail: async (payload: { to: string; replyTo?: string; subject: string; html: string }) => {
      mail.sent.push(payload);
      return { success: true, messageId: "m1" };
    },
  };
});

import { registerForEvent } from "./helpers/register";
import { schoolInfo } from "@/lib/data";
import { getRegistrationAlertSetting, normalizeAlertEmails, setRegistrationAlertEmails } from "@/lib/registration-alerts";

let photo: Buffer;
beforeAll(async () => {
  photo = await makeImage(800, 800);
});
beforeEach(async () => {
  mail.sent = [];
  await resetDatabase();
});
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

const toCommittee = (inbox: string) => mail.sent.filter((m) => m.to === inbox);

describe("new registration alerts", () => {
  it("emails the association's mailbox when someone joins, with the member as Reply-To", async () => {
    vi.stubEnv("CONTACT_INBOX_EMAIL", "committee@example.test");
    await makeEvent({ slug: "jubilee", title: "Golden Jubilee", isMembershipEvent: true, packages: [{ name: "General", price: 1000, adults: 1, children: 0 }], paymentInstructions: "bKash 01XXXXXXXXX" });
    await registerForEvent({
      slug: "jubilee",
      sessionUserId: null,
      account: { fullName: "New Member", fullNameBn: "নতুন সদস্য", email: "new@example.test", password: "Member-Pw-2026", sscBatch: 2001, dateOfBirth: "1985-06-15", phone: "01711000111", phoneVerificationToken: verifiedPhoneToken() },
      photo,
      proof: { type: "SSC_CERTIFICATE", file: makePdf() },
      rsvp: { packageName: "General", paymentMethod: "bKash", transactionId: "9AB3XK1" },
    });

    const [alert] = toCommittee("committee@example.test");
    expect(alert.subject).toBe("New member: New Member (SSC 2001), Golden Jubilee");
    expect(alert.replyTo).toBe("new@example.test");
    expect(alert.html).toContain("নতুন সদস্য");
    expect(alert.html).toContain("9AB3XK1");
    expect(alert.html).toContain("/admin/verifications");
    // The member still gets their own email.
    expect(mail.sent.some((m) => m.to === "new@example.test")).toBe(true);
  });

  it("goes to the addresses admins chose, and to nobody when the list is empty", async () => {
    const admin = await makeMember({ role: "ADMIN" });
    const member = await makeMember();
    const event = await makeEvent({ slug: "picnic", title: "Batch Picnic" });

    vi.stubEnv("CONTACT_INBOX_EMAIL", "");
    expect((await getRegistrationAlertSetting()).emails).toEqual([schoolInfo.associationEmail]);
    await setRegistrationAlertEmails([" GS@Example.test ", "gs@example.test", "treasurer@example.test"], admin.email);
    await registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} });
    expect(mail.sent.map((m) => m.to).filter((t) => t !== member.email).sort()).toEqual(["gs@example.test", "treasurer@example.test"]);
    const alert = toCommittee("gs@example.test")[0];
    expect(alert.subject).toContain("New registration:");
    expect(alert.html).toContain(`/admin/events/${event.id}`);

    mail.sent = [];
    await setRegistrationAlertEmails([], admin.email);
    const other = await makeMember();
    await registerForEvent({ slug: "picnic", sessionUserId: other.id, rsvp: {} });
    expect(mail.sent.filter((m) => m.to !== other.email)).toEqual([]);
  });

  it("checks the addresses", () => {
    expect(() => normalizeAlertEmails("a@b.co")).toThrow();
    expect(() => normalizeAlertEmails(["not-an-email"])).toThrow(/not a valid email/);
    expect(() => normalizeAlertEmails(["a@b.co", "b@b.co", "c@b.co", "d@b.co", "e@b.co", "f@b.co"])).toThrow(/At most 5/);
    expect(normalizeAlertEmails(["", " A@B.co "])).toEqual(["a@b.co"]);
  });
});

describe("paper forms", () => {
  it("are not alerted: the committee typed them in", async () => {
    vi.stubEnv("CONTACT_INBOX_EMAIL", "committee@example.test");
    const event = await makeEvent({ slug: "jubilee", isMembershipEvent: true, registrationFee: 1500 });
    const { enterOfflineRegistration } = await import("@/lib/events/offline-entry");
    await enterOfflineRegistration({
      eventId: event.id,
      staff: { email: "staff@example.test" },
      member: { fullName: "Paper Member", phone: "01711000444", sscBatch: 1995 },
      proofType: "SCHOOL_TESTIMONIAL",
      paymentMethod: "Cash",
    });
    expect(toCommittee("committee@example.test")).toEqual([]);
    expect(await prisma.eventRegistration.count()).toBe(1);
  });
});
