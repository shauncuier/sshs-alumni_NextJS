import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import prisma from "@/lib/prisma";
import { decideRegistration, getAdminEvent } from "@/lib/events/admin";
import { hasPendingMembershipPayment } from "@/lib/events/membership";
import { registerForEvent } from "@/lib/events/registrations";
import { discardDecidedProofs } from "@/lib/members/proof-retention";
import { makeImage, makePdf } from "../helpers/images";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

beforeEach(async () => {
  await resetDatabase();
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});
afterEach(() => {
  vi.restoreAllMocks();
});
afterAll(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

const join = async () => {
  const event = await makeEvent({ slug: "jubilee", isMembershipEvent: true, packages: [{ name: "General", price: 1000 }], paymentInstructions: "bKash 01XXXXXXXXX" });
  const { registration } = await registerForEvent({
    slug: "jubilee",
    sessionUserId: null,
    photo: await makeImage(800, 800),
    proof: { type: "SSC_CERTIFICATE", file: makePdf() },
    account: { fullName: "New Member", email: "new@example.test", password: "Member-Pw-2026", sscBatch: 2001 },
    rsvp: { packageName: "General", paymentMethod: "bKash", transactionId: "TRX123456", donationAmount: 250 },
  });
  return { event, registration };
};

it("approving a membership registration confirms payment and verifies the member", async () => {
  const { event, registration } = await join();
  const decided = await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "admin@example.test" });
  expect(decided).toMatchObject({ status: "CONFIRMED", confirmedBy: "admin@example.test", membershipStatus: "VERIFIED" });
  const user = await prisma.user.findUniqueOrThrow({ where: { email: "new@example.test" }, include: { profile: true, verificationRequests: true } });
  expect([user.status, user.profile?.verificationStatus, user.verificationRequests[0].status]).toEqual(["VERIFIED", "VERIFIED", "VERIFIED"]);
  expect(user.verificationRequests[0].reviewedBy).toBe("admin@example.test");
});

it("rejecting a new member's registration rejects the membership", async () => {
  const { event, registration } = await join();
  await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "CANCEL", adminEmail: "admin@example.test" });
  const user = await prisma.user.findUniqueOrThrow({ where: { email: "new@example.test" } });
  expect(user.status).toBe("REJECTED");
});

it("cancelling an already-verified member's registration keeps them verified", async () => {
  const event = await makeEvent({ slug: "jubilee", isMembershipEvent: true, packages: [{ name: "General", price: 1000 }], paymentInstructions: "x" });
  const member = await makeMember({ status: "VERIFIED" });
  const { registration } = await registerForEvent({ slug: "jubilee", sessionUserId: member.id, rsvp: { packageName: "General", paymentMethod: "Nagad", transactionId: "NGD1234567" } });
  await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "CANCEL", adminEmail: "a@x.test" });
  expect((await prisma.user.findUniqueOrThrow({ where: { id: member.id } })).status).toBe("VERIFIED");
});

it("only allows valid status changes", async () => {
  const { event, registration } = await join();
  const decide = (action: "APPROVE" | "CANCEL" | "CHECK_IN" | "UNDO_CHECK_IN") =>
    decideRegistration({ eventId: event.id, registrationId: registration.id, action, adminEmail: "a@x.test" });
  await expect(decide("CHECK_IN")).rejects.toMatchObject({ status: 409 }); // not paid yet
  await decide("APPROVE");
  await expect(decide("APPROVE")).rejects.toMatchObject({ status: 409 });
  expect((await decide("CHECK_IN")).status).toBe("CHECKED_IN");
  expect((await decide("UNDO_CHECK_IN")).status).toBe("CONFIRMED");
});

it("lists attendees with membership status and totals", async () => {
  const { event, registration } = await join();
  let admin = await getAdminEvent(event.id);
  expect(admin.registrations[0]).toMatchObject({ name: "New Member", membershipStatus: "PENDING", transactionId: "TRX123456", batch: 2001 });
  expect(admin.totals).toMatchObject({ pendingRevenue: 1250, confirmedRevenue: 0 });
  await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "a@x.test" });
  admin = await getAdminEvent(event.id);
  expect(admin.totals).toMatchObject({ confirmedRevenue: 1250, confirmedDonations: 250, headCount: 1 });
});

it("knows who is waiting for membership payment confirmation", async () => {
  await join();
  const user = await prisma.user.findUniqueOrThrow({ where: { email: "new@example.test" } });
  expect(await hasPendingMembershipPayment(prisma, user.id)).toBe(true);
});

it("resolves a concurrent APPROVE + CANCEL race safely: exactly one wins, and the member's status always matches the winner", async () => {
  // Real-DB concurrency race, repeated to catch flakiness rather than relying on a single lucky interleaving.
  for (let attempt = 0; attempt < 8; attempt++) {
    await resetDatabase();
    const { event, registration } = await join();

    const [approve, cancel] = await Promise.allSettled([
      decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "admin-a@example.test" }),
      decideRegistration({ eventId: event.id, registrationId: registration.id, action: "CANCEL", adminEmail: "admin-b@example.test" }),
    ]);

    const outcomes = [approve, cancel];
    const fulfilled = outcomes.filter((r) => r.status === "fulfilled");
    const rejected = outcomes.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ status: 409 });

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "new@example.test" },
      include: { profile: true, verificationRequests: true },
    });
    const expected = approve.status === "fulfilled" ? "VERIFIED" : "REJECTED";
    expect([user.status, user.profile?.verificationStatus, user.verificationRequests[0]?.status]).toEqual([
      expected,
      expected,
      expected,
    ]);
    // Whichever decision won, the proof file is gone afterwards.
    expect(user.verificationRequests[0]?.proofFileUrl).toBeNull();
  }
  // Eight full joins (photo + proof processing, bcrypt) and races: allow more than the default 20 s.
}, 60_000);

it("returns 409 (not a second success) when the same APPROVE is issued twice concurrently", async () => {
  const { event, registration } = await join();
  const [a, b] = await Promise.allSettled([
    decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "admin-a@example.test" }),
    decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "admin-b@example.test" }),
  ]);
  const outcomes = [a, b];
  expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const rejected = outcomes.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  expect(rejected).toHaveLength(1);
  expect(rejected[0].reason).toMatchObject({ status: 409 });
});

describe("proof of study after the membership decision", () => {
  const request = () => prisma.verificationRequest.findFirstOrThrow({ where: { user: { email: "new@example.test" } } });
  const proofDir = (fileUrl: string) => path.join(process.env.UPLOADS_DIR!, "proofs", fileUrl.split("/")[4]);
  const exists = (dir: string) => fs.access(dir).then(() => true, () => false);

  it("shows the proof in the attendee list while it is waiting for a decision", async () => {
    const { event } = await join();
    const fileUrl = (await request()).proofFileUrl!;
    const [row] = (await getAdminEvent(event.id)).registrations;
    expect(row.proof).toEqual({ type: "SSC_CERTIFICATE", note: null, fileUrl, mime: "application/pdf", reviewedBy: null, deletedAt: null });
  });

  it("deletes the proof file when the membership is approved, keeping the type and reviewer", async () => {
    const { event, registration } = await join();
    const before = await request();
    const decided = await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "admin@example.test" });
    const after = await request();
    expect(after).toMatchObject({ status: "VERIFIED", proofType: "SSC_CERTIFICATE", proofFileUrl: null, proofMime: "application/pdf", reviewedBy: "admin@example.test" });
    expect(after.proofDeletedAt).toBeInstanceOf(Date);
    expect(await exists(proofDir(before.proofFileUrl!))).toBe(false);
    expect(decided.proof).toMatchObject({ type: "SSC_CERTIFICATE", fileUrl: null, reviewedBy: "admin@example.test" });
    expect(decided.proof?.deletedAt).toEqual(after.proofDeletedAt!.toISOString());
  });

  it("deletes the proof file when the membership is rejected", async () => {
    const { event, registration } = await join();
    const before = await request();
    await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "CANCEL", adminEmail: "admin@example.test" });
    const after = await request();
    expect(after).toMatchObject({ status: "REJECTED", proofType: "SSC_CERTIFICATE", proofFileUrl: null, reviewedBy: "admin@example.test" });
    expect(after.proofDeletedAt).toBeInstanceOf(Date);
    expect(await exists(proofDir(before.proofFileUrl!))).toBe(false);
  });

  it("keeps the proof when cancelling the registration of a member who is already verified", async () => {
    const { event, registration } = await join();
    const before = await request();
    await prisma.user.update({ where: { email: "new@example.test" }, data: { status: "VERIFIED" } });
    await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "CANCEL", adminEmail: "admin@example.test" });
    const after = await request();
    expect(after).toMatchObject({ status: "PENDING", proofFileUrl: before.proofFileUrl, proofDeletedAt: null });
    expect(await exists(proofDir(before.proofFileUrl!))).toBe(true);
  });

  it("does not undo the decision when the file cannot be deleted, and retries later", async () => {
    const { event, registration } = await join();
    const before = await request();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(fs, "rm").mockRejectedValueOnce(Object.assign(new Error("EBUSY: resource busy"), { code: "EBUSY" }));
    const decided = await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "admin@example.test" });
    expect(decided).toMatchObject({ status: "CONFIRMED", membershipStatus: "VERIFIED" });
    const after = await request();
    expect(after).toMatchObject({ status: "VERIFIED", proofFileUrl: before.proofFileUrl, proofDeletedAt: null });
    expect(await exists(proofDir(before.proofFileUrl!))).toBe(true);
    expect(errors).toHaveBeenCalledTimes(1);
    const logged = errors.mock.calls[0].map(String).join(" ");
    expect(logged).toContain(before.id);
    expect(logged).not.toContain("new@example.test");
    expect(logged).not.toContain("New Member");

    vi.restoreAllMocks();
    await discardDecidedProofs();
    expect(await request()).toMatchObject({ proofFileUrl: null });
    expect(await exists(proofDir(before.proofFileUrl!))).toBe(false);
  });
});
