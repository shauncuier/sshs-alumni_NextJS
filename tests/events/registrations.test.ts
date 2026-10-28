import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import prisma from "@/lib/prisma";
import { cleanSource, getMemberRegistration, membershipEventStanding } from "@/lib/events/registrations";
import { registerForEvent } from "../helpers/register";
import { readTicketToken, TICKET_QR_PREFIX } from "@/lib/events/tickets";
import { decideRegistration } from "@/lib/events/admin";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";
import { makeImage, makePdf } from "../helpers/images";
import { verifiedEmailToken, verifiedPhoneToken } from "../helpers/phone";
import { setOtpRequired } from "@/lib/otp-setting";
import type { RsvpInput } from "@/lib/events/types";

beforeEach(async () => {
  await resetDatabase();
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

let photo: Buffer;
let proof: { type: string; note?: string | null; file?: Buffer };
beforeAll(async () => {
  photo = await makeImage(800, 800);
  proof = { type: "SSC_CERTIFICATE", file: makePdf() };
});
afterAll(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});
const avatarFolders = async () => fs.readdir(path.join(process.env.UPLOADS_DIR!, "avatars")).catch(() => [] as string[]);
const proofFolders = async () => fs.readdir(path.join(process.env.UPLOADS_DIR!, "proofs")).catch(() => [] as string[]);

const packages = [
  { name: "General", price: 1000, adults: 1, children: 0 },
  { name: "Patron", price: 5000, adults: 1, children: 0, guestsFree: true },
];
const membershipEvent = () =>
  makeEvent({ slug: "jubilee", isMembershipEvent: true, packages, extraAdultFee: 500, childFee: 300, paymentInstructions: "bKash 01XXXXXXXXX", maxAttendees: 10 });
const account = { fullName: "New Member", email: "new@example.test", password: "Member-Pw-2026", sscBatch: 2001, dateOfBirth: "1985-06-15", rollNumber: "12", section: "A", phoneVerificationToken: verifiedPhoneToken() };
const paidRsvp = { packageName: "General", extraAdults: 1, guestPeople: { "Extra adult": [{ name: "Guest One" }] }, paymentMethod: "bKash", transactionId: " 9ab3xk1 ", donationAmount: 500 };

describe("joining through the membership event", () => {
  it("creates the account, verification request and pending registration together", async () => {
    await membershipEvent();
    const { registration, createdAccount } = await registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: paidRsvp });
    expect(createdAccount).toEqual({ email: "new@example.test" });
    expect(registration).toMatchObject({ status: "PENDING_PAYMENT", headCount: 2, totalFee: 1500, donationAmount: 500, transactionId: "9AB3XK1", ticket: null });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "new@example.test" }, include: { verificationRequests: true } });
    expect(user.status).toBe("PENDING");
    expect(user.verificationRequests).toHaveLength(1);
  });

  it("saves the SMS-verified phone number, not the one typed in", async () => {
    await membershipEvent();
    await registerForEvent({ slug: "jubilee", sessionUserId: null, account: { ...account, phone: "01999999999" }, photo, proof, rsvp: paidRsvp });
    const profile = await prisma.alumniProfile.findFirstOrThrow({ where: { user: { email: "new@example.test" } } });
    expect(profile.phone).toBe("01711000111");
  });

  it("refuses a new member without a valid contact verification, before saving any upload", async () => {
    await membershipEvent();
    const cases: [Record<string, unknown>, string][] = [
      [{ phoneVerificationToken: undefined }, "CONTACT_NOT_VERIFIED"],
      [{ phoneVerificationToken: "forged-token" }, "PHONE_NOT_VERIFIED"],
      [{ phoneVerificationToken: verifiedPhoneToken("8801711000111", Date.now() - 1) }, "PHONE_NOT_VERIFIED"],
      [{ phoneVerificationToken: undefined, emailVerificationToken: "forged-token" }, "EMAIL_NOT_VERIFIED"],
      // An email token only counts for the address it was issued for.
      [{ phoneVerificationToken: undefined, emailVerificationToken: verifiedEmailToken("someone.else@example.test") }, "EMAIL_NOT_VERIFIED"],
    ];
    for (const [tokens, code] of cases) {
      await expect(
        registerForEvent({ slug: "jubilee", sessionUserId: null, account: { ...account, ...tokens }, photo, proof, rsvp: paidRsvp })
      ).rejects.toMatchObject({ status: 400, code });
    }
    expect(await prisma.user.count()).toBe(0);
    expect(await avatarFolders()).toEqual([]);
    expect(await proofFolders()).toEqual([]);
  });

  it("needs the new member's date of birth, saved on the profile", async () => {
    await membershipEvent();
    for (const [dateOfBirth, code] of [
      [undefined, "DATE_OF_BIRTH_REQUIRED"],
      ["", "DATE_OF_BIRTH_REQUIRED"],
      ["15/06/1985", "INVALID_DATE_OF_BIRTH"],
      ["2001-02-30", "INVALID_DATE_OF_BIRTH"],
      [`${new Date().getFullYear() - 3}-01-01`, "INVALID_DATE_OF_BIRTH"],
    ] as const) {
      await expect(
        registerForEvent({ slug: "jubilee", sessionUserId: null, account: { ...account, dateOfBirth }, photo, proof, rsvp: paidRsvp })
      ).rejects.toMatchObject({ status: 400, code });
    }
    expect(await prisma.user.count()).toBe(0);
    await registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: paidRsvp });
    const profile = await prisma.alumniProfile.findFirstOrThrow({ where: { user: { email: "new@example.test" } } });
    expect(profile.dateOfBirth?.toISOString().slice(0, 10)).toBe("1985-06-15");
  });

  it("needs a name for every guest and an age for every child", async () => {
    await membershipEvent();
    const bad: [unknown, string][] = [
      [undefined, "Guest One"],
      [{ "Extra adult": [] }, "name"],
      [{ "Extra adult": [{ name: " " }] }, "name"],
    ];
    for (const [guestPeople] of bad) {
      await expect(
        registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: { ...paidRsvp, guestPeople } as RsvpInput })
      ).rejects.toMatchObject({ status: 400, code: "GUEST_DETAILS_REQUIRED" });
    }
    // Children: an age from 0 to 17.
    const withChild = { ...paidRsvp, extraAdults: 0, extraChildren: 1 };
    for (const age of [undefined, "", -1, 18, 3.5]) {
      await expect(
        registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: { ...withChild, guestPeople: { "Child under 12": [{ name: "Tuba", age }] } } as RsvpInput })
      ).rejects.toMatchObject({ status: 400, code: "GUEST_DETAILS_REQUIRED" });
    }
    expect(await prisma.user.count()).toBe(0);
    const { registration } = await registerForEvent({
      slug: "jubilee",
      sessionUserId: null,
      account,
      photo,
      proof,
      rsvp: { ...withChild, guestPeople: { "Child under 12": [{ name: "  Tuba   Akter ", age: 0 }] } } as RsvpInput,
    });
    expect(registration.guests).toEqual([{ name: "Child under 12", count: 1, price: 300, people: [{ name: "Tuba Akter", age: 0 }] }]);
  });

  it("takes the typed number without a code while an admin has switched codes off", async () => {
    await membershipEvent();
    await setOtpRequired(false, "admin@example.test");
    const noCode = { ...account, phone: "01811 000 444", phoneVerificationToken: undefined };
    const { createdAccount } = await registerForEvent({ slug: "jubilee", sessionUserId: null, account: noCode, photo, proof, rsvp: paidRsvp });
    expect(createdAccount).toEqual({ email: "new@example.test" });
    const profile = await prisma.alumniProfile.findFirstOrThrow({ where: { user: { email: "new@example.test" } } });
    expect(profile.phone).toBe("01811000444");
    // The number must still be a valid mobile number.
    await expect(
      registerForEvent({ slug: "jubilee", sessionUserId: null, account: { ...noCode, email: "other@example.test", phone: "12345" }, photo, proof, rsvp: paidRsvp })
    ).rejects.toMatchObject({ status: 400, code: "INVALID_PHONE" });
    // Switched back on, a code is required again.
    await setOtpRequired(true, "admin@example.test");
    await expect(
      registerForEvent({ slug: "jubilee", sessionUserId: null, account: { ...noCode, email: "third@example.test", phone: "01811000555" }, photo, proof, rsvp: paidRsvp })
    ).rejects.toMatchObject({ status: 400, code: "CONTACT_NOT_VERIFIED" });
  });

  it("accepts an email verification when the SMS could not be used, keeping the typed phone", async () => {
    await membershipEvent();
    const emailVerified = { ...account, phone: "01811000333", phoneVerificationToken: undefined, emailVerificationToken: verifiedEmailToken("new@example.test") };
    const { createdAccount } = await registerForEvent({ slug: "jubilee", sessionUserId: null, account: { ...emailVerified, email: " New@Example.test " }, photo, proof, rsvp: paidRsvp });
    expect(createdAccount).toEqual({ email: "new@example.test" });
    const profile = await prisma.alumniProfile.findFirstOrThrow({ where: { user: { email: "new@example.test" } } });
    expect(profile.phone).toBe("01811000333");
  });

  it("leaves nothing behind when the registration fails", async () => {
    await membershipEvent();
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: { ...paidRsvp, transactionId: "" } })).rejects.toMatchObject({ status: 400 });
    expect(await prisma.user.count()).toBe(0);
  });

  it("never attaches a registration to an existing account", async () => {
    await membershipEvent();
    await makeMember({ email: "new@example.test" });
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: paidRsvp })).rejects.toMatchObject({ status: 409, code: "EMAIL_EXISTS" });
    expect(await prisma.eventRegistration.count()).toBe(0);
  });

  it("refuses a zero-fee membership registration", async () => {
    await makeEvent({ slug: "jubilee", isMembershipEvent: true, packages: [{ name: "Free", price: 0 }], paymentInstructions: "x" });
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: { packageName: "Free" } })).rejects.toMatchObject({ status: 400 });
  });

  it("accepts Bangla QR as a payment method and refuses unknown ones", async () => {
    await membershipEvent();
    const paidAt = new Date(Date.now() - 10 * 60_000).toISOString();
    const { registration } = await registerForEvent({
      slug: "jubilee",
      sessionUserId: null,
      account,
      photo,
      proof,
      rsvp: { ...paidRsvp, paymentMethod: "Bangla QR", payerAccountLast4: "55 17", payerPaidAt: paidAt },
    });
    expect(registration.paymentMethod).toBe("Bangla QR");
    expect(await prisma.eventRegistration.findUniqueOrThrow({ where: { id: registration.id } })).toMatchObject({
      payerAccountLast4: "5517",
      payerPaidAt: new Date(paidAt),
      merchantTrxId: null,
    });
    const member = await makeMember({ role: "MODERATOR", status: "PENDING" }); // staff who has not joined yet
    await expect(
      registerForEvent({ slug: "jubilee", sessionUserId: member.id, rsvp: { ...paidRsvp, transactionId: "OTHER123", paymentMethod: "PayPal" } })
    ).rejects.toMatchObject({ status: 400, code: "PAYMENT_REQUIRED" });
  });

  it("needs the last 4 digits and the time for Bangla QR, and a screenshot for every paid method but cash", async () => {
    await membershipEvent();
    const member = await makeMember({ role: "MODERATOR", status: "PENDING" }); // staff who has not joined yet
    const qr = { ...paidRsvp, paymentMethod: "Bangla QR", payerPaidAt: new Date().toISOString() };
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: member.id, rsvp: { ...qr, payerAccountLast4: "551" } })).rejects.toMatchObject({
      status: 400,
      code: "INVALID_ACCOUNT_DIGITS",
    });
    await expect(
      registerForEvent({ slug: "jubilee", sessionUserId: member.id, rsvp: { ...qr, payerAccountLast4: "5517", payerPaidAt: "2020-01-01T10:00:00Z" } })
    ).rejects.toMatchObject({ status: 400, code: "INVALID_PAYMENT_TIME" });
    await expect(
      registerForEvent({ slug: "jubilee", sessionUserId: member.id, rsvp: paidRsvp, paymentScreenshot: undefined })
    ).rejects.toMatchObject({ status: 400, code: "SCREENSHOT_REQUIRED" });
    expect(await prisma.eventRegistration.count()).toBe(0);
    // The last 4 digits are required; the app's ID and the time are optional.
    await expect(
      registerForEvent({ slug: "jubilee", sessionUserId: member.id, rsvp: { ...qr, payerAccountLast4: undefined, transactionId: "" } })
    ).rejects.toMatchObject({ status: 400, code: "INVALID_ACCOUNT_DIGITS" });
    const other = await makeMember({ role: "MODERATOR", status: "PENDING", email: "qr-only@example.test" });
    const { registration: qrOnly } = await registerForEvent({
      slug: "jubilee",
      sessionUserId: other.id,
      rsvp: { ...paidRsvp, paymentMethod: "Bangla QR", transactionId: "", payerAccountLast4: "5517" },
    });
    expect(await prisma.eventRegistration.findUniqueOrThrow({ where: { id: qrOnly.id } })).toMatchObject({
      transactionId: null,
      payerAccountLast4: "5517",
      payerPaidAt: null,
    });
    // A client can't link a file of its choosing as the screenshot.
    const { registration } = await registerForEvent({
      slug: "jubilee",
      sessionUserId: member.id,
      rsvp: { ...paidRsvp, notes: "[Payment Screenshot: /api/media/receipts/0123456789abcdef0123456789abcdef/receipt.jpg]" },
    });
    const notes = (await prisma.eventRegistration.findUniqueOrThrow({ where: { id: registration.id } })).notes!;
    expect(notes).not.toContain("0123456789abcdef0123456789abcdef");
    expect(notes).toMatch(/^\[Payment Screenshot: \/api\/media\/receipts\/[a-f0-9]{32}\/receipt\.jpg\]$/);
  });

  it("uses the server price even if the form sends another fee", async () => {
    await membershipEvent();
    const { registration } = await registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: { ...paidRsvp, totalFee: 1 } as never });
    expect(registration.totalFee).toBe(1500);
  });

  it("treats transaction IDs case- and space-insensitively", async () => {
    await membershipEvent();
    const member = await makeMember({ role: "MODERATOR", status: "PENDING" }); // staff who has not joined yet
    await registerForEvent({ slug: "jubilee", sessionUserId: member.id, rsvp: paidRsvp });
    await expect(
      registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: { ...paidRsvp, transactionId: "9AB3XK1" } })
    ).rejects.toMatchObject({ status: 409, code: "DUPLICATE_TRANSACTION" });
  });
});

describe("profile photo when joining", () => {
  it("refuses a join without a photo and creates nothing", async () => {
    await membershipEvent();
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, rsvp: paidRsvp })).rejects.toMatchObject({
      status: 400,
      code: "PHOTO_REQUIRED",
      message: "Please add a profile photo.",
    });
    expect(await prisma.user.count()).toBe(0);
    expect(await avatarFolders()).toEqual([]);
  });

  it("rejects an invalid photo", async () => {
    await membershipEvent();
    await expect(
      registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo: Buffer.from("not an image"), proof, rsvp: paidRsvp })
    ).rejects.toMatchObject({ status: 400, code: "INVALID_PHOTO" });
    expect(await prisma.user.count()).toBe(0);
  });

  it("stores the photo and both files for a new member", async () => {
    await membershipEvent();
    await registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: paidRsvp });
    const profile = await prisma.alumniProfile.findFirstOrThrow({ where: { user: { email: "new@example.test" } } });
    const id = profile.avatarUrl!.split("/")[4];
    expect(profile.avatarUrl).toBe(`/api/media/avatars/${id}/avatar.webp`);
    expect(profile.avatarOriginalUrl).toBe(`/api/media/avatars/${id}/original.jpg`);
    const dir = path.join(process.env.UPLOADS_DIR!, "avatars", id);
    expect((await fs.readdir(dir)).sort()).toEqual(["avatar.webp", "original.jpg"]);
  });

  it("removes the files when the registration fails", async () => {
    await membershipEvent();
    await makeMember({ email: "new@example.test" });
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: paidRsvp })).rejects.toMatchObject({ status: 409, code: "EMAIL_EXISTS" });
    expect(await avatarFolders()).toEqual([]);
    expect(await proofFolders()).toEqual([]);
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account: { ...account, email: "other@example.test" }, photo, proof, rsvp: { ...paidRsvp, transactionId: "" } })).rejects.toMatchObject({ status: 400 });
    expect(await avatarFolders()).toEqual([]);
    expect(await proofFolders()).toEqual([]);
  });

  it("ignores avatar URLs sent by the client", async () => {
    await membershipEvent();
    const evil = { ...account, avatarUrl: "https://evil.example/x.png", avatarOriginalUrl: "https://evil.example/y.jpg" };
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account: evil, rsvp: paidRsvp })).rejects.toMatchObject({ code: "PHOTO_REQUIRED" });
    expect(await prisma.user.count()).toBe(0);
    await registerForEvent({ slug: "jubilee", sessionUserId: null, account: evil, photo, proof, rsvp: paidRsvp });
    const profile = await prisma.alumniProfile.findFirstOrThrow({ where: { user: { email: "new@example.test" } } });
    expect(profile.avatarUrl).toMatch(/^\/api\/media\/avatars\/[a-f0-9]{32}\/avatar\.webp$/);
    expect(profile.avatarOriginalUrl).toMatch(/^\/api\/media\/avatars\/[a-f0-9]{32}\/original\.jpg$/);
  });

  it("needs no photo from a signed-in account", async () => {
    await membershipEvent();
    const member = await makeMember({ role: "MODERATOR", status: "PENDING" }); // staff who has not joined yet
    const { registration } = await registerForEvent({ slug: "jubilee", sessionUserId: member.id, rsvp: paidRsvp });
    expect(registration.status).toBe("PENDING_PAYMENT");
    expect(await avatarFolders()).toEqual([]);
  });
});

describe("proof of study when joining", () => {
  const verification = () => prisma.verificationRequest.findFirstOrThrow({ where: { user: { email: "new@example.test" } } });

  it("refuses a join without a proof document and leaves nothing behind", async () => {
    await membershipEvent();
    for (const p of [undefined, { type: "SSC_CERTIFICATE" }]) {
      await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof: p, rsvp: paidRsvp })).rejects.toMatchObject({
        status: 400,
        code: "PROOF_REQUIRED",
        message: "Please add a document that shows you studied at SSGHS.",
      });
    }
    expect(await prisma.user.count()).toBe(0);
    expect(await avatarFolders()).toEqual([]);
    expect(await proofFolders()).toEqual([]);
  });

  it("needs one of the three documents, and keeps any note short", async () => {
    await membershipEvent();
    const file = makePdf();
    for (const type of ["", "PASSPORT", "OTHER", "SCHOOL_ID_CARD", undefined]) {
      await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof: { type: type as string, file }, rsvp: paidRsvp })).rejects.toMatchObject({
        status: 400,
        code: "INVALID_PROOF",
        message: "Please choose the type of document.",
      });
    }
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof: { type: "SSC_MARKSHEET", note: "x".repeat(201), file }, rsvp: paidRsvp })).rejects.toMatchObject({
      status: 400,
      code: "INVALID_PROOF",
    });
    expect(await prisma.user.count()).toBe(0);
    expect(await avatarFolders()).toEqual([]);
    expect(await proofFolders()).toEqual([]);
  });

  it("rejects an invalid proof file without keeping the photo", async () => {
    await membershipEvent();
    await expect(
      registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof: { type: "SSC_CERTIFICATE", file: Buffer.from("just text") }, rsvp: paidRsvp })
    ).rejects.toMatchObject({ status: 400, code: "INVALID_PROOF" });
    expect(await prisma.user.count()).toBe(0);
    expect(await avatarFolders()).toEqual([]);
    expect(await proofFolders()).toEqual([]);
  });

  it("stores the document and its type on the verification request", async () => {
    await membershipEvent();
    await registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: paidRsvp });
    const request = await verification();
    expect(request).toMatchObject({ proofType: "SSC_CERTIFICATE", proofNote: null, proofMime: "application/pdf", proofDeletedAt: null });
    const [, id] = /^\/api\/media\/proofs\/([a-f0-9]{32})\/document\.pdf$/.exec(request.proofFileUrl!)!;
    const file = path.join(process.env.UPLOADS_DIR!, "proofs", id, "document.pdf");
    expect((await fs.readFile(file)).equals(makePdf())).toBe(true);
  });

  it("stores an image proof as JPEG with the member's note", async () => {
    await membershipEvent();
    const note = "  Signed by the headmistress  ";
    await registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof: { type: "SCHOOL_TESTIMONIAL", note, file: await makeImage(500, 700, "png") }, rsvp: paidRsvp });
    const request = await verification();
    expect(request).toMatchObject({ proofType: "SCHOOL_TESTIMONIAL", proofNote: "Signed by the headmistress", proofMime: "image/jpeg" });
    expect(request.proofFileUrl).toMatch(/^\/api\/media\/proofs\/[a-f0-9]{32}\/document\.jpg$/);
  });

  it("ignores proof URLs sent by the client", async () => {
    await membershipEvent();
    const evil = { ...account, proofFileUrl: "https://evil.example/doc.pdf", proofMime: "text/html", proofType: "OTHER" } as never;
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account: evil, photo, rsvp: paidRsvp })).rejects.toMatchObject({ code: "PROOF_REQUIRED" });
    await registerForEvent({ slug: "jubilee", sessionUserId: null, account: evil, photo, proof, rsvp: paidRsvp });
    const request = await verification();
    expect(request).toMatchObject({ proofType: "SSC_CERTIFICATE", proofMime: "application/pdf" });
    expect(request.proofFileUrl).toMatch(/^\/api\/media\/proofs\/[a-f0-9]{32}\/document\.pdf$/);
  });

  it("needs no proof from a signed-in account", async () => {
    await membershipEvent();
    const member = await makeMember({ role: "MODERATOR", status: "PENDING" }); // staff who has not joined yet
    await registerForEvent({ slug: "jubilee", sessionUserId: member.id, proof: { type: "SSC_CERTIFICATE", file: makePdf() }, rsvp: paidRsvp });
    expect(await proofFolders()).toEqual([]);
  });
});

describe("other events", () => {
  it("needs a signed-in, verified member", async () => {
    await makeEvent({ slug: "picnic" });
    await expect(registerForEvent({ slug: "picnic", sessionUserId: null, account, rsvp: {} })).rejects.toMatchObject({ status: 401 });
    const pending = await makeMember({ status: "PENDING" });
    await expect(registerForEvent({ slug: "picnic", sessionUserId: pending.id, rsvp: {} })).rejects.toMatchObject({ status: 403 });
  });

  it("confirms free events straight away and gives a ticket", async () => {
    await makeEvent({ slug: "picnic" });
    const member = await makeMember();
    const { registration } = await registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} });
    expect(registration.status).toBe("CONFIRMED");
    expect(registration.ticket?.qrText.startsWith(TICKET_QR_PREFIX)).toBe(true);
    expect(readTicketToken(registration.ticket!.qrText)).toBe(registration.id);
  });

  it("refuses a second registration and closed events", async () => {
    await makeEvent({ slug: "picnic" });
    await makeEvent({ slug: "closed", isRegistrationOpen: false });
    const member = await makeMember();
    await registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} });
    await expect(registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} })).rejects.toMatchObject({ status: 409, code: "ALREADY_REGISTERED" });
    await expect(registerForEvent({ slug: "closed", sessionUserId: member.id, rsvp: {} })).rejects.toMatchObject({ status: 409, code: "REGISTRATION_CLOSED" });
  });

  it("never exceeds capacity, even for simultaneous registrations", async () => {
    await makeEvent({ slug: "small", maxAttendees: 1 });
    const [a, b] = [await makeMember(), await makeMember()];
    const results = await Promise.allSettled([
      registerForEvent({ slug: "small", sessionUserId: a.id, rsvp: {} }),
      registerForEvent({ slug: "small", sessionUserId: b.id, rsvp: {} }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.eventRegistration.count()).toBe(1);
  });

  it("reports a transaction ID collision caught by the database, not just the pre-check", async () => {
    // Two different events: their row locks don't serialize the two
    // registrations, so both can pass the in-transaction duplicate-transactionId
    // check before either commits, and only the database's unique constraint on
    // EventRegistration.transactionId catches the collision — this must surface
    // as DUPLICATE_TRANSACTION, not the generic ALREADY_REGISTERED.
    await makeEvent({ slug: "concert", registrationFee: 1000, paymentInstructions: "bKash 01XXXXXXXXX" });
    await makeEvent({ slug: "gala", registrationFee: 1000, paymentInstructions: "bKash 01XXXXXXXXX" });
    const [a, b] = [await makeMember(), await makeMember()];
    const rsvp = { paymentMethod: "bKash", transactionId: "COLLIDE12345" };
    const results = await Promise.allSettled([
      registerForEvent({ slug: "concert", sessionUserId: a.id, rsvp }),
      registerForEvent({ slug: "gala", sessionUserId: b.id, rsvp }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected?.status).toBe("rejected");
    expect((rejected as PromiseRejectedResult).reason).toMatchObject({ status: 409, code: "DUPLICATE_TRANSACTION" });
    expect(await prisma.eventRegistration.count()).toBe(1);
  });

  it("returns the member's own registration", async () => {
    await makeEvent({ slug: "picnic" });
    const member = await makeMember();
    await registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} });
    expect(await getMemberRegistration("picnic", member.id)).toMatchObject({ eventSlug: "picnic", status: "CONFIRMED" });
    expect(await getMemberRegistration("picnic", (await makeMember()).id)).toBeNull();
  });
});

describe("guest types (Golden Jubilee 2026 prices)", () => {
  const jubilee2026 = () =>
    makeEvent({
      slug: "jubilee-2026",
      isMembershipEvent: true,
      registrationFee: 1500,
      guestTypes: [
        { name: "Spouse", price: 700, max: 1 },
        { name: "Child", price: 500, max: 5 },
      ],
      paymentInstructions: "bKash 01XXXXXXXXX",
      maxAttendees: 10,
    });

  it("charges the member fee plus each guest and stores the guests on the registration", async () => {
    await jubilee2026();
    const { registration } = await registerForEvent({
      slug: "jubilee-2026",
      sessionUserId: null,
      account,
      photo,
      proof,
      rsvp: { guests: { Spouse: 1, Child: 2 }, guestPeople: { Spouse: [{ name: "Rina" }], Child: [{ name: "Tuba", age: 7 }, { name: "Rafi", age: "4" }] }, paymentMethod: "bKash", transactionId: "TRX7001" },
    });
    expect(registration).toMatchObject({
      headCount: 4,
      totalFee: 1500 + 700 + 1000,
      guests: [
        { name: "Spouse", count: 1, price: 700, people: [{ name: "Rina" }] },
        { name: "Child", count: 2, price: 500, people: [{ name: "Tuba", age: 7 }, { name: "Rafi", age: 4 }] },
      ],
    });
  });

  it("refuses more guests of a type than the event allows", async () => {
    await jubilee2026();
    await expect(
      registerForEvent({ slug: "jubilee-2026", sessionUserId: null, account, photo, proof, rsvp: { guests: { Spouse: 2 }, paymentMethod: "bKash", transactionId: "TRX7002" } })
    ).rejects.toMatchObject({ code: "INVALID_GUESTS" });
    expect(await prisma.user.count({ where: { email: "new@example.test" } })).toBe(0);
  });
});

describe("where a registration came from", () => {
  it("keeps a clean tag from the ad link", () => {
    expect(cleanSource("Facebook/Jubilee2026")).toBe("facebook/jubilee2026");
    expect(cleanSource("  fb ad <script> ")).toBe("fb-ad-script");
    expect(cleanSource("x".repeat(200))).toHaveLength(80);
    expect(cleanSource("")).toBeNull();
    expect(cleanSource(42)).toBeNull();
  });

  it("is saved with the registration and shown to admins", async () => {
    const event = await membershipEvent();
    await registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: { ...paidRsvp, source: "facebook/jubilee2026" } });
    const reg = await prisma.eventRegistration.findFirstOrThrow({ where: { eventId: event.id } });
    expect(reg.source).toBe("facebook/jubilee2026");
  });
});

describe("membership event standing (the /jubilee page)", () => {
  it("tells apart nothing yet, payment under review, ticket ready and an approved member", async () => {
    const event = await membershipEvent();
    const staff = await makeMember({ role: "MODERATOR", status: "PENDING" });
    expect(await membershipEventStanding(event.id, staff.id)).toBeNull();

    const { registration } = await registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: paidRsvp });
    const joiner = await prisma.user.findUniqueOrThrow({ where: { email: "new@example.test" } });
    expect(await membershipEventStanding(event.id, joiner.id)).toBe("REVIEW");
    await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "a@x.test" });
    expect(await membershipEventStanding(event.id, joiner.id)).toBe("TICKET");

    const member = await makeMember(); // approved, but their old registration is gone
    expect(await membershipEventStanding(event.id, member.id)).toBe("MEMBER");
  });
});

describe("fee by SSC batch", () => {
  it("charges the joiner the fee of the batch on the form, and a signed-in account its profile's batch", async () => {
    await makeEvent({
      slug: "jubilee",
      isMembershipEvent: true,
      registrationFee: 1500,
      paymentInstructions: "bKash",
      batchFees: [
        { fromBatch: 1989, toBatch: 2014, price: 1500 },
        { fromBatch: 2015, toBatch: 2026, price: 1250 },
      ],
      guestTypes: [{ name: "Spouse", price: 600, max: 1 }],
    });
    const { registration } = await registerForEvent({
      slug: "jubilee",
      sessionUserId: null,
      account: { ...account, sscBatch: 2018 },
      photo,
      proof,
      rsvp: { guests: { Spouse: 1 }, guestPeople: { Spouse: [{ name: "Rina" }] }, paymentMethod: "bKash", transactionId: "TRX20180001" },
    });
    expect(registration.totalFee).toBe(1250 + 600);

    const staff = await makeMember({ role: "MODERATOR", status: "PENDING" });
    await prisma.alumniProfile.update({ where: { userId: staff.id }, data: { sscBatch: 1995 } });
    const other = await registerForEvent({ slug: "jubilee", sessionUserId: staff.id, rsvp: { paymentMethod: "bKash", transactionId: "TRX19950001" } });
    expect(other.registration.totalFee).toBe(1500);
  });
});

describe("blood group when joining", () => {
  it("is optional, saved when given, refused when not a real group", async () => {
    await membershipEvent();
    await registerForEvent({ slug: "jubilee", sessionUserId: null, account: { ...account, bloodGroup: "ab +" }, photo, proof, rsvp: paidRsvp });
    const p = await prisma.alumniProfile.findFirstOrThrow({ where: { user: { email: "new@example.test" } } });
    expect(p.bloodGroup).toBe("AB+");

    await resetDatabase();
    await membershipEvent();
    await expect(
      registerForEvent({ slug: "jubilee", sessionUserId: null, account: { ...account, bloodGroup: "Z" }, photo, proof, rsvp: paidRsvp })
    ).rejects.toMatchObject({ status: 400, code: "INVALID_ACCOUNT" });
  });
});

describe("work and address when joining", () => {
  it("saves profession, designation, company and address; all optional", async () => {
    await membershipEvent();
    await registerForEvent({
      slug: "jubilee",
      sessionUserId: null,
      account: { ...account, profession: " Doctor ", designation: "Assistant Professor", company: "Chittagong Medical College", address: "House 5, Road 2, Sitakunda, Chattogram" },
      photo,
      proof,
      rsvp: paidRsvp,
    });
    const p = await prisma.alumniProfile.findFirstOrThrow({ where: { user: { email: "new@example.test" } } });
    expect(p).toMatchObject({ profession: "Doctor", designation: "Assistant Professor", company: "Chittagong Medical College", address: "House 5, Road 2, Sitakunda, Chattogram" });

    await resetDatabase();
    await membershipEvent();
    await registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: paidRsvp });
    const q = await prisma.alumniProfile.findFirstOrThrow({ where: { user: { email: "new@example.test" } } });
    expect(q).toMatchObject({ profession: "Alumnus", designation: null, company: null, address: null });
  });
});
