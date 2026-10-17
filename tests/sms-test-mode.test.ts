import { beforeEach, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

const sms = vi.hoisted(() => ({ sent: 0 }));
vi.mock("@/lib/bulksmsbd", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bulksmsbd")>();
  return {
    ...actual,
    sendBulkSms: async (args: { numbers: string[] }) => {
      sms.sent += 1;
      return { success: true, isSimulated: false, responseCode: 202, totalNumbers: 1, validNumbers: args.numbers, invalidNumbers: [] };
    },
  };
});
const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { readVerifiedPhone, requestPhoneOtp, verifyPhoneOtp } from "@/lib/phone-otp";
import { getSmsTestMode, setSmsTestMode, TEST_MODE_HOURS } from "@/lib/sms-test-mode";
import { GET, PUT } from "@/app/api/admin/sms/test-mode/route";

beforeEach(async () => {
  sms.sent = 0;
  session.user = null;
  await resetDatabase();
});

const put = (on: unknown) =>
  PUT(new Request("http://x/api/admin/sms/test-mode", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ on }) }));

it("in test mode no SMS is sent: the code comes back and verifies like a texted one", async () => {
  await setSmsTestMode(true, "admin@example.test");
  const res = await requestPhoneOtp("01711000601");
  expect(sms.sent).toBe(0);
  expect(res.testCode).toMatch(/^\d+$/);
  const { verificationToken } = verifyPhoneOtp(res.challenge, res.testCode!);
  expect(readVerifiedPhone(verificationToken)).toBe("01711000601");

  await setSmsTestMode(false, "admin@example.test");
  const live = await requestPhoneOtp("01711000602");
  expect(sms.sent).toBe(1);
  expect(live.testCode).toBeUndefined();
});

it("switches itself off after the set hours", async () => {
  const start = Date.now();
  await setSmsTestMode(true, "admin@example.test", start);
  expect((await getSmsTestMode(start + 60_000)).on).toBe(true);
  expect((await getSmsTestMode(start + TEST_MODE_HOURS * 60 * 60_000 + 1)).on).toBe(false);
});

it("only admins switch it, and every switch is logged", async () => {
  const mod = await makeMember({ role: "MODERATOR" });
  session.user = { id: mod.id, email: mod.email, role: "MODERATOR" };
  expect((await put(true)).status).toBe(403);

  const admin = await makeMember({ role: "ADMIN" });
  session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
  expect((await put("yes")).status).toBe(400);
  const on = await put(true);
  expect(on.status).toBe(200);
  expect(await on.json()).toMatchObject({ on: true, updatedBy: admin.email });
  expect((await (await GET()).json()).on).toBe(true);
  expect((await (await put(false)).json()).on).toBe(false);
  const actions = (await prisma.activityLog.findMany({ where: { category: "SECURITY" }, orderBy: { createdAt: "asc" } })).map((l) => l.action);
  expect(actions).toEqual(expect.arrayContaining(["sms_test_mode.on", "sms_test_mode.off"]));
});
