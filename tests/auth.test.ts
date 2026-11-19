import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeCredentials, SIGN_IN_PAUSED_MESSAGE } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { LEGACY_PENDING_MESSAGE, MEMBERSHIP_REJECTED_MESSAGE, PENDING_APPROVAL_MESSAGE } from "@/lib/account-access";
import { makeEvent, makeMember, resetDatabase } from "./helpers/db";

const PASSWORD = "Member-Pw-1234";

describe("authorizeCredentials", () => {
  beforeEach(resetDatabase);

  it("signs in a verified member", async () => {
    const m = await makeMember({ status: "VERIFIED" });
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).resolves.toMatchObject({ id: m.id, email: m.email });
  });
  it("refuses a pending member whose membership payment is under review with the payment message", async () => {
    const m = await makeMember({ status: "PENDING" });
    const event = await makeEvent({ isMembershipEvent: true, registrationFee: 1000 });
    await prisma.eventRegistration.create({
      data: { eventId: event.id, userId: m.id, status: "PENDING_PAYMENT", totalFee: 1000, transactionId: "TRX-AUTH-1" },
    });
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).rejects.toThrow(new Error(PENDING_APPROVAL_MESSAGE));
  });
  it("tells a pending member with no membership payment (old free sign-up) to contact the committee", async () => {
    const m = await makeMember({ status: "PENDING" });
    // A pending registration for an ordinary event is not a membership payment.
    const event = await makeEvent({ registrationFee: 500 });
    await prisma.eventRegistration.create({
      data: { eventId: event.id, userId: m.id, status: "PENDING_PAYMENT", totalFee: 500, transactionId: "TRX-AUTH-2" },
    });
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).rejects.toThrow(new Error(LEGACY_PENDING_MESSAGE));
  });
  it("refuses a rejected member", async () => {
    const m = await makeMember({ status: "REJECTED" });
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).rejects.toThrow(new Error(MEMBERSHIP_REJECTED_MESSAGE));
  });
  it("never locks out staff", async () => {
    const m = await makeMember({ status: "PENDING", role: "ADMIN" });
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).resolves.toMatchObject({ id: m.id, role: "ADMIN" });
  });
  it("pauses signing in while the site reads the standby copy (it holds no password hashes)", async () => {
    const m = await makeMember({ status: "VERIFIED" });
    process.env.STANDBY_DATABASE_URL = "mysql://u:p@standby.example:4000/sshs_standby";
    const mode = await import("@/lib/db-mode");
    vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mode.setMode("standby");
      await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).rejects.toThrow(new Error(SIGN_IN_PAUSED_MESSAGE));
    } finally {
      mode.resetDbMode();
      fs.rmSync(path.join(process.env.UPLOADS_DIR!, ".db-mode.json"), { force: true });
      process.env.STANDBY_DATABASE_URL = "";
      vi.restoreAllMocks();
    }
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).resolves.toMatchObject({ id: m.id });
  });
  it("keeps the generic message for a wrong password", async () => {
    const m = await makeMember({ status: "PENDING" });
    await expect(authorizeCredentials({ email: m.email, password: "wrong-password" })).rejects.toThrow(/Invalid email or password/);
  });
});
