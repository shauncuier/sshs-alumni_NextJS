import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { availableMethods, getPaymentSettings, paymentLines, updatePaymentSettings } from "@/lib/payment-settings";
import { getPublicEventBySlug } from "@/lib/events/service";
import { registerForEvent } from "@/lib/events/registrations";
import { GET as publicRoute } from "@/app/api/payment-settings/route";
import { GET as adminGet, PUT as adminPut } from "@/app/api/admin/payment-settings/route";
import { findDemoLeftovers } from "../prisma/seed-core";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const details = { bkashNumber: "+880 1711-000111", bkashType: "Merchant", nagadNumber: "01811000222", bankDetails: "A/C 123, Sonali Bank\nRouting 456", banglaQrMerchant: "Praktan Sabujian Parishad" };
const put = (body: unknown) => new Request("http://x", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("payment details", () => {
  it("fall back to the environment until an admin saves them", async () => {
    vi.stubEnv("NEXT_PUBLIC_BANGLA_QR_MERCHANT", "From Env");
    expect(await getPaymentSettings()).toMatchObject({ banglaQrMerchant: "From Env", bkashNumber: "", updatedAt: null });
  });

  it("are saved with normalised numbers and listed for members in a fixed order", async () => {
    const { after } = await updatePaymentSettings(details, "admin@example.test");
    expect(after).toMatchObject({ bkashNumber: "01711000111", bkashType: "Merchant", nagadNumber: "01811000222", nagadType: "Personal", updatedBy: "admin@example.test" });
    expect(paymentLines(after)).toEqual(["bKash (Merchant): 01711000111", "Nagad (Personal): 01811000222", "A/C 123, Sonali Bank", "Routing 456"]);
  });

  it("refuse wrong numbers and linked (not uploaded) QR images", async () => {
    await expect(updatePaymentSettings({ bkashNumber: "12345" }, "a@x")).rejects.toMatchObject({ status: 400 });
    await expect(updatePaymentSettings({ nagadNumber: "02111000222" }, "a@x")).rejects.toMatchObject({ status: 400 });
    await expect(updatePaymentSettings({ banglaQrImage: "https://evil.example/qr.png" }, "a@x")).rejects.toMatchObject({ status: 400 });
  });

  it("only admins change them; every change is logged with old and new values; anyone can read them", async () => {
    expect((await adminPut(put(details))).status).toBe(403);
    const mod = await makeMember({ role: "MODERATOR" });
    session.user = { id: mod.id, email: mod.email, role: "MODERATOR" };
    expect((await adminPut(put(details))).status).toBe(403);
    expect((await adminGet()).status).toBe(403);

    const admin = await makeMember({ role: "ADMIN" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    expect((await adminPut(put(details))).status).toBe(200);
    const log = await prisma.activityLog.findFirstOrThrow({ where: { action: "payment_settings.updated" } });
    expect(JSON.stringify(log.metadata)).toContain("01711000111");

    session.user = null;
    const pub = await (await publicRoute()).json();
    expect(pub).toMatchObject({ bkashNumber: "01711000111", nagadNumber: "01811000222", banglaQrMerchant: "Praktan Sabujian Parishad" });
    expect(pub.lines).toHaveLength(4);
    expect(pub).not.toHaveProperty("updatedBy");
  });
});

describe("made-up payment accounts", () => {
  it("are reported by the production seed", async () => {
    await makeEvent({ title: "Golden Jubilee", paymentInstructions: "bKash (Merchant): Send to 01700000000" });
    await makeEvent({ title: "Real", paymentInstructions: "bKash: 01711000111" });
    const warnings = await findDemoLeftovers({});
    expect(warnings).toEqual([expect.stringContaining('"Golden Jubilee" shows made-up payment accounts')]);
  });
});

describe("payment methods switched on and off (one setting for the whole site)", () => {
  it("offers only methods that are on and have their details", async () => {
    const { after } = await updatePaymentSettings({ ...details, enabledMethods: ["bKash", "Cash"], cashDetails: "School office, to the treasurer" }, "a@x");
    expect(availableMethods(after)).toEqual(["bKash", "Cash"]);
    expect(paymentLines(after)).toEqual(["bKash (Merchant): 01711000111", "Cash: School office, to the treasurer"]);
    const pub = await (await publicRoute()).json();
    expect(pub.methods).toEqual(["bKash", "Cash"]);
  });

  it("refuses to switch on a method without its details", async () => {
    await expect(updatePaymentSettings({ enabledMethods: ["Nagad"] }, "a@x")).rejects.toThrow(/Nagad is switched on/);
    await expect(updatePaymentSettings({ enabledMethods: ["Bangla QR"] }, "a@x")).rejects.toThrow(/Bangla QR image/);
  });

  it("opens paid events without per-event instructions, and refuses a method that is off", async () => {
    await makeEvent({ slug: "paid", registrationFee: 500, paymentInstructions: null });
    expect((await getPublicEventBySlug("paid"))?.closedReason).toBe("PAYMENT_DETAILS_MISSING");

    await updatePaymentSettings({ ...details, enabledMethods: ["bKash"] }, "a@x");
    const event = await getPublicEventBySlug("paid");
    expect(event).toMatchObject({ closedReason: null, paymentMethods: ["bKash"] });

    const member = await makeMember();
    await expect(
      registerForEvent({ slug: "paid", sessionUserId: member.id, rsvp: { paymentMethod: "Nagad", transactionId: "TRX9001" } })
    ).rejects.toThrow(/Nagad is not accepted/);
    const { registration } = await registerForEvent({ slug: "paid", sessionUserId: member.id, rsvp: { paymentMethod: "bKash", transactionId: "TRX9002" } });
    expect(registration).toMatchObject({ status: "PENDING_PAYMENT", totalFee: 500 });
  });
});
