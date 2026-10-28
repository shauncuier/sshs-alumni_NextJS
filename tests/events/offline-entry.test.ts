import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";
import { makeImage } from "../helpers/images";

const sms = vi.hoisted(() => ({ sent: [] as { numbers: string[]; message: string }[] }));
vi.mock("@/lib/bulksmsbd", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bulksmsbd")>();
  return {
    ...actual,
    sendBulkSms: async (args: { numbers: string[]; message: string }) => {
      sms.sent.push(args);
      return { success: true, isSimulated: false, responseCode: 202, totalNumbers: 1, validNumbers: args.numbers, invalidNumbers: [] };
    },
  };
});
const mail = vi.hoisted(() => ({ sent: [] as { to: string }[] }));
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...actual,
    sendEmail: async (payload: { to: string }) => {
      // Mirrors the real guard: placeholder addresses are never mailed.
      if (payload.to.endsWith(".invalid")) return { success: false, error: "No real email address" };
      mail.sent.push(payload);
      return { success: true, messageId: "m1" };
    },
  };
});

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { enterOfflineRegistration, NO_EMAIL_DOMAIN } from "@/lib/events/offline-entry";
import { POST } from "@/app/api/admin/events/[id]/offline-entry/route";
import { sendEmail } from "@/lib/email";
import { slipsForEvent } from "@/lib/events/slips";
import { slipNumber, tokensForPrint } from "@/lib/events/tokens";
import { OFFLINE_SOURCE } from "@/lib/events/types";
import { readOfflineNote, registrationListForPrint } from "@/lib/events/registration-list";

beforeEach(async () => {
  sms.sent = [];
  mail.sent = [];
  session.user = null;
  await resetDatabase();
});
afterAll(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

const jubilee = () =>
  makeEvent({
    slug: "jubilee",
    isMembershipEvent: true,
    registrationFee: 1500,
    // Closed online and past its deadline: a paper form filled in earlier still counts.
    isRegistrationOpen: false,
    registrationDeadline: new Date("2020-01-01"),
    maxAttendees: 10,
  });
const member = { fullName: "Paper Member", phone: "01711000222", sscBatch: 1995, profession: "Teacher", address: "Sitakunda" };
const staff = { email: "committee@example.test" };

describe("paper forms entered by the committee", () => {
  it("approves the member and confirms the registration at once, without proof upload, photo, email or SMS code", async () => {
    const event = await jubilee();
    const result = await enterOfflineRegistration({ eventId: event.id, staff, member, proofType: "SCHOOL_TESTIMONIAL", paymentMethod: "Cash", formNo: "17", receiptNo: "R-9" });
    expect(result.email).toBe(`01711000222@${NO_EMAIL_DOMAIN}`);
    expect(result.totalFee).toBe(1500);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: result.userId }, include: { profile: true, verificationRequests: true } });
    expect(user.status).toBe("VERIFIED");
    expect(user.profile).toMatchObject({ verificationStatus: "VERIFIED", phone: "01711000222", profession: "Teacher", address: "Sitakunda", avatarUrl: "/logo.png" });
    expect(user.verificationRequests[0]).toMatchObject({ status: "VERIFIED", reviewedBy: staff.email, proofType: "SCHOOL_TESTIMONIAL", proofFileUrl: null });
    expect(user.verificationRequests[0].proofNote).toContain("checked by committee@example.test");

    const reg = await prisma.eventRegistration.findUniqueOrThrow({ where: { id: result.registrationId } });
    expect(reg).toMatchObject({ status: "CONFIRMED", confirmedBy: staff.email, paymentMethod: "Cash", transactionId: null, source: "offline-form" });
    expect(reg.notes).toContain("form no. 17, receipt no. R-9");

    // Told by SMS; no mail to the placeholder address.
    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0].numbers[0]).toContain("1711000222");
    expect(mail.sent).toHaveLength(0);
  });

  it("emails a member who wrote an email, and saves an optional photo", async () => {
    const event = await jubilee();
    const photo = await makeImage(800, 800);
    const result = await enterOfflineRegistration({
      eventId: event.id,
      staff,
      member: { ...member, email: " Paper@Example.test " },
      proofType: "SSC_CERTIFICATE",
      photo,
      paymentMethod: "Bangla QR",
      transactionId: " abc12345 ",
    });
    expect(result.email).toBe("paper@example.test");
    const profile = await prisma.alumniProfile.findUniqueOrThrow({ where: { userId: result.userId } });
    expect(profile.avatarUrl).toMatch(/^\/api\/media\/avatars\//);
    const reg = await prisma.eventRegistration.findUniqueOrThrow({ where: { id: result.registrationId } });
    expect(reg.transactionId).toBe("ABC12345");
    // Staff copy the TrxID from our OK Wallet SMS: it is recorded as the SMS TrxID too.
    expect(reg.merchantTrxId).toBe("ABC12345");
    expect(mail.sent.map((m) => m.to)).toEqual(["paper@example.test", "paper@example.test"]);
  });

  it("refuses a missing proof tick, a QR payment without TrxID, a taken number and other events", async () => {
    const event = await jubilee();
    const base = { eventId: event.id, staff, member, proofType: "SSC_MARKSHEET", paymentMethod: "Cash" };
    await expect(enterOfflineRegistration({ ...base, proofType: "" })).rejects.toMatchObject({ code: "INVALID_PROOF" });
    await expect(enterOfflineRegistration({ ...base, proofType: "OTHER" })).rejects.toMatchObject({ code: "INVALID_PROOF" });
    await expect(enterOfflineRegistration({ ...base, paymentMethod: "bKash" })).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
    await expect(enterOfflineRegistration({ ...base, paymentMethod: "Bangla QR" })).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
    await enterOfflineRegistration(base);
    await expect(enterOfflineRegistration({ ...base, member: { ...member, fullName: "Someone Else" } })).rejects.toMatchObject({ code: "PHONE_TAKEN" });
    const other = await makeEvent({ slug: "picnic" });
    await expect(enterOfflineRegistration({ ...base, eventId: other.id, member: { ...member, phone: "01711000333" } })).rejects.toMatchObject({ code: "NOT_MEMBERSHIP_EVENT" });
    expect(await prisma.user.count()).toBe(1);
  });

  it("never sends mail to a placeholder address", async () => {
    // The real sendEmail, not the mock above.
    const real = await vi.importActual<typeof import("@/lib/email")>("@/lib/email");
    expect(await real.sendEmail({ to: `01711000222@${NO_EMAIL_DOMAIN}`, subject: "x", html: "x" })).toMatchObject({ success: false });
    expect(sendEmail).toBeDefined();
  });

  it("only the committee may use the route", async () => {
    const event = await jubilee();
    const post = () => {
      const fd = new FormData();
      fd.append("payload", JSON.stringify({ member, proofType: "SSC_CERTIFICATE", paymentMethod: "Cash" }));
      return POST(new Request(`http://localhost:3000/api/admin/events/${event.id}/offline-entry`, { method: "POST", body: fd, headers: { origin: "http://localhost:3000" } }), {
        params: Promise.resolve({ id: event.id }),
      });
    };
    const alumnus = await makeMember();
    session.user = { id: alumnus.id, email: alumnus.email, role: "ALUMNI" };
    expect((await post()).status).toBe(403);
    const mod = await makeMember({ role: "MODERATOR" });
    session.user = { id: mod.id, email: mod.email, role: "MODERATOR" };
    expect((await post()).status).toBe(403);
    const admin = await makeMember({ role: "ADMIN" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    const res = await post();
    expect(res.status).toBe(201);
    const log = await prisma.activityLog.findFirst({ where: { action: "registration.offline_entered" } });
    expect(log?.actorEmail).toBe(admin.email);
  });
  it("bulk printing can take only the paper forms", async () => {
    const event = await jubilee();
    const paper = await enterOfflineRegistration({ eventId: event.id, staff, member, proofType: "SSC_CERTIFICATE", paymentMethod: "Cash", guests: {} });
    const online = await makeMember();
    await prisma.eventRegistration.create({ data: { eventId: event.id, userId: online.id, status: "CONFIRMED", headCount: 1, guestCount: 1, totalFee: 1500, paymentMethod: "bKash", transactionId: "ONLINE123" } });

    expect((await slipsForEvent(event.id)).length).toBe(2);
    const slips = await slipsForEvent(event.id, { source: OFFLINE_SOURCE });
    expect(slips.map((s) => s.registrationId)).toEqual([paper.registrationId]);
    const tokens = await tokensForPrint(event.id, { source: OFFLINE_SOURCE });
    expect(new Set(tokens.map((t) => t.slipNo))).toEqual(new Set([slipNumber(paper.registrationId)]));
    expect(tokens).toHaveLength(4); // breakfast, lunch, dinner for one person + the kit
  });
  it("the printed entries list shows form and receipt numbers, who entered it and the totals' parts", async () => {
    const event = await jubilee();
    const paper = await enterOfflineRegistration({ eventId: event.id, staff, member, proofType: "SSC_CERTIFICATE", paymentMethod: "Cash", formNo: "17", receiptNo: "R-9" });
    const rows = await registrationListForPrint(event.id, { source: OFFLINE_SOURCE });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      registrationId: paper.registrationId,
      name: "Paper Member",
      batch: 1995,
      phone: "01711000222",
      email: null,
      formNo: "17",
      receiptNo: "R-9",
      enteredBy: staff.email,
      totalFee: 1500,
      paymentMethod: "Cash",
    });
    expect(readOfflineNote("[Offline form, entered by a@b.test]")).toEqual({ formNo: null, receiptNo: null, enteredBy: "a@b.test" });
    expect(readOfflineNote("paid online")).toEqual({ formNo: null, receiptNo: null, enteredBy: null });
  });
});
