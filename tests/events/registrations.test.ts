import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import prisma from "@/lib/prisma";
import { getMemberRegistration, registerForEvent } from "@/lib/events/registrations";
import { readTicketToken, TICKET_QR_PREFIX } from "@/lib/events/tickets";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";
import { makeImage, makePdf } from "../helpers/images";

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
const account = { fullName: "New Member", email: "new@example.test", password: "Member-Pw-2026", sscBatch: 2001, rollNumber: "12", section: "A" };
const paidRsvp = { packageName: "General", extraAdults: 1, paymentMethod: "bKash", transactionId: " 9ab3xk1 ", donationAmount: 500 };

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

  it("uses the server price even if the form sends another fee", async () => {
    await membershipEvent();
    const { registration } = await registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof, rsvp: { ...paidRsvp, totalFee: 1 } as never });
    expect(registration.totalFee).toBe(1500);
  });

  it("treats transaction IDs case- and space-insensitively", async () => {
    await membershipEvent();
    const member = await makeMember();
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

  it("needs no photo from a signed-in member", async () => {
    await membershipEvent();
    const member = await makeMember();
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

  it("needs a known document type, and a description for OTHER", async () => {
    await membershipEvent();
    const file = makePdf();
    for (const type of ["", "PASSPORT", undefined]) {
      await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof: { type: type as string, file }, rsvp: paidRsvp })).rejects.toMatchObject({
        status: 400,
        code: "INVALID_PROOF",
        message: "Please choose the type of document.",
      });
    }
    for (const note of [undefined, "", "   "]) {
      await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof: { type: "OTHER", note, file }, rsvp: paidRsvp })).rejects.toMatchObject({
        status: 400,
        code: "INVALID_PROOF",
        message: "Please describe the document.",
      });
    }
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof: { type: "OTHER", note: "x".repeat(201), file }, rsvp: paidRsvp })).rejects.toMatchObject({
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

  it("stores an image proof as JPEG with the member's description", async () => {
    await membershipEvent();
    const note = "  Letter from the headmistress  ";
    await registerForEvent({ slug: "jubilee", sessionUserId: null, account, photo, proof: { type: "OTHER", note, file: await makeImage(500, 700, "png") }, rsvp: paidRsvp });
    const request = await verification();
    expect(request).toMatchObject({ proofType: "OTHER", proofNote: "Letter from the headmistress", proofMime: "image/jpeg" });
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

  it("needs no proof from a signed-in member", async () => {
    await membershipEvent();
    const member = await makeMember();
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
