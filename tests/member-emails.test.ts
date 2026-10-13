import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import { makeEvent, makeMember, resetDatabase } from "./helpers/db";
import { makeImage, makePdf } from "./helpers/images";
import { verifiedPhoneToken } from "./helpers/phone";

const mail = vi.hoisted(() => ({ sent: [] as { to: string; subject: string; html: string; text: string }[], fail: false }));
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...actual,
    sendEmail: async (payload: { to: string; subject: string; html: string; text: string }) => {
      if (mail.fail) throw new Error("mail server down");
      mail.sent.push(payload);
      return { success: true, messageId: "m1" };
    },
  };
});

import { decideRegistration } from "@/lib/events/admin";
import { registerForEvent } from "@/lib/events/registrations";
import { renderEmail } from "@/lib/email-templates";
import { EMAIL_SAMPLES } from "@/lib/email-samples";
import prisma from "@/lib/prisma";

beforeEach(async () => {
  mail.sent = [];
  mail.fail = false;
  await resetDatabase();
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});
afterAll(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

describe("email layout", () => {
  it("escapes everything a person typed, in the HTML", () => {
    const email = renderEmail({ subject: "s", preheader: "p", heading: "<b>Hi</b>", paragraphs: ['<script>alert("x")</script>'], quote: "<img src=x onerror=alert(1)>" });
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.text).toContain('<script>alert("x")</script>'); // plain text stays as written
  });

  it("builds every email with a subject, HTML and a plain-text version", () => {
    for (const [name, build] of Object.entries(EMAIL_SAMPLES)) {
      const email = build();
      expect(email.subject, name).toBeTruthy();
      expect(email.html, name).toContain("SSGHS Alumni Association");
      expect(email.text.length, name).toBeGreaterThan(40);
    }
  });
});

const join = async () => {
  const event = await makeEvent({
    slug: "jubilee",
    title: "Golden Jubilee",
    isMembershipEvent: true,
    registrationFee: 1500,
    guestTypes: [{ name: "Spouse", price: 700, max: 1 }],
    paymentInstructions: "bKash 01XXXXXXXXX",
  });
  const { registration } = await registerForEvent({
    slug: "jubilee",
    sessionUserId: null,
    photo: await makeImage(800, 800),
    proof: { type: "SSC_CERTIFICATE", file: makePdf() },
    account: { fullName: "New Member", email: "new@example.test", password: "Member-Pw-2026", sscBatch: 2001, phoneVerificationToken: verifiedPhoneToken() },
    rsvp: { guests: { Spouse: 1 }, paymentMethod: "bKash", transactionId: "TRX123456" },
  });
  return { event, registration };
};

describe("emails to members", () => {
  it("joining sends 'registration received' with the fee, guests and transaction", async () => {
    await join();
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]).toMatchObject({ to: "new@example.test", subject: "We received your registration: Golden Jubilee" });
    expect(mail.sent[0].text).toContain("you + Spouse × 1");
    expect(mail.sent[0].text).toContain("৳2,200");
    expect(mail.sent[0].text).toContain("TRX123456");
  });

  it("approving sends the membership welcome and the confirmed ticket; rejecting sends the rejection", async () => {
    const { event, registration } = await join();
    mail.sent = [];
    await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "admin@example.test" });
    expect(mail.sent.map((m) => m.subject)).toEqual(["Welcome to the SSGHS Alumni Association", "You're registered: Golden Jubilee"]);

    await resetDatabase();
    const again = await join();
    mail.sent = [];
    await decideRegistration({ eventId: again.event.id, registrationId: again.registration.id, action: "CANCEL", adminEmail: "admin@example.test" });
    expect(mail.sent.map((m) => m.subject)).toEqual(["About your SSGHS Alumni membership application"]);
  });

  it("a free event confirms at once", async () => {
    await makeEvent({ slug: "picnic", title: "Batch picnic" });
    const member = await makeMember();
    await registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} });
    expect(mail.sent.map((m) => m.subject)).toEqual(["You're registered: Batch picnic"]);
  });

  it("confirming a later payment of an approved member sends only the ticket, not the welcome again", async () => {
    const { event, registration } = await join();
    await prisma.user.update({ where: { email: "new@example.test" }, data: { status: "VERIFIED" } });
    mail.sent = [];
    await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "admin@example.test" });
    expect(mail.sent.map((m) => m.subject)).toEqual(["You're registered: Golden Jubilee"]);
  });

  it("an approved member is never asked to pay the membership event again", async () => {
    await makeEvent({ slug: "jubilee", title: "Golden Jubilee", isMembershipEvent: true, registrationFee: 1500, paymentInstructions: "bKash 01XXXXXXXXX" });
    const member = await makeMember();
    await expect(
      registerForEvent({ slug: "jubilee", sessionUserId: member.id, rsvp: { paymentMethod: "bKash", transactionId: "TRX999999" } })
    ).rejects.toMatchObject({ code: "ALREADY_MEMBER", status: 409 });
    expect(await prisma.eventRegistration.count()).toBe(0);
    expect(mail.sent).toHaveLength(0);
    // An approved staff account that never joined as an alumnus may still pay.
    const admin = await makeMember({ role: "ADMIN" });
    await prisma.alumniProfile.update({ where: { userId: admin.id }, data: { verificationStatus: "PENDING" } });
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: admin.id, rsvp: { paymentMethod: "bKash", transactionId: "TRX888888" } })).resolves.toBeTruthy();
  });

  it("a mail failure never fails the registration", async () => {
    mail.fail = true;
    const { registration } = await join();
    expect(registration.status).toBe("PENDING_PAYMENT");
  });
});
