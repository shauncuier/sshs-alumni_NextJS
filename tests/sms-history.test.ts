import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

const gateway = vi.hoisted(() => ({ fail: false }));
vi.mock("@/lib/bulksmsbd", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bulksmsbd")>();
  return {
    ...actual,
    sendBulkSms: async ({ numbers }: { numbers: string[] }) => {
      const valid = numbers.map(actual.normalizeBdPhoneNumber).filter((n): n is string => Boolean(n && actual.isValidBdMobile(n)));
      const invalid = numbers.filter((n) => !valid.includes(actual.normalizeBdPhoneNumber(n) ?? ""));
      return gateway.fail
        ? { success: false, isSimulated: false, responseCode: 1007, totalNumbers: valid.length, validNumbers: valid, invalidNumbers: invalid, error: "Insufficient balance" }
        : { success: true, isSimulated: false, responseCode: 202, messageId: "M-1", totalNumbers: valid.length, validNumbers: valid, invalidNumbers: invalid };
    },
  };
});

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { GET, POST } from "@/app/api/admin/sms/send/route";

beforeEach(async () => {
  gateway.fail = false;
  session.user = null;
  await resetDatabase();
});

const send = (body: unknown) => POST(new Request("http://x/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
const numbers = ["01711000001", "01811000002", "01911000003", "01611000004", "01511000005", "01311000006", "bad-number"];

describe("bulk SMS history", () => {
  it("is admin-only", async () => {
    expect((await GET()).status).toBe(403);
    expect((await send({ recipients: numbers, message: "Hi" })).status).toBe(403);
  });

  it("records each send with every recipient, and lists newest first", async () => {
    const admin = await makeMember({ role: "ADMIN", email: "boss@example.test" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };

    expect((await send({ recipients: numbers, message: "Reunion on Friday" })).status).toBe(200);
    expect((await send({ recipients: numbers.slice(0, 2), message: "Second" })).status).toBe(200);

    const row = await prisma.smsBroadcast.findFirstOrThrow({ where: { message: "Reunion on Friday" } });
    expect(row).toMatchObject({ status: "SENT", sentBy: "boss@example.test", validRecipients: 6, invalidRecipients: 1, totalCreditsUsed: 6, messageId: "M-1" });
    expect(row.recipients).toHaveLength(6);

    const { history } = await (await GET()).json();
    expect(history.map((h: { message: string }) => h.message)).toEqual(["Second", "Reunion on Friday"]);
    expect(history[1].sampleRecipients).toHaveLength(5);

    // Nothing is written to the old JSON file any more.
    await expect(fs.access(path.join(process.env.UPLOADS_DIR!, "sms-history.json"))).rejects.toThrow();
  });

  it("records a failed send so credits can be reconciled", async () => {
    const admin = await makeMember({ role: "ADMIN" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    gateway.fail = true;
    expect((await send({ recipients: numbers, message: "Will fail" })).status).toBe(400);
    const row = await prisma.smsBroadcast.findFirstOrThrow();
    expect(row).toMatchObject({ status: "FAILED", gatewayResponseCode: 1007, error: "Insufficient balance" });
    const { history } = await (await GET()).json();
    expect(history[0].status).toBe("FAILED");
  });
});
