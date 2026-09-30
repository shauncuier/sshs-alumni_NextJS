import { beforeEach, describe, expect, it } from "vitest";
import { authorizeCredentials } from "@/lib/auth";
import { MEMBERSHIP_REJECTED_MESSAGE, PENDING_APPROVAL_MESSAGE } from "@/lib/account-access";
import { makeMember, resetDatabase } from "./helpers/db";

const PASSWORD = "Member-Pw-1234";

describe("authorizeCredentials", () => {
  beforeEach(resetDatabase);

  it("signs in a verified member", async () => {
    const m = await makeMember({ status: "VERIFIED" });
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).resolves.toMatchObject({ id: m.id, email: m.email });
  });
  it("refuses a pending member with the approval message", async () => {
    const m = await makeMember({ status: "PENDING" });
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).rejects.toThrow(new Error(PENDING_APPROVAL_MESSAGE));
  });
  it("refuses a rejected member", async () => {
    const m = await makeMember({ status: "REJECTED" });
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).rejects.toThrow(new Error(MEMBERSHIP_REJECTED_MESSAGE));
  });
  it("never locks out staff", async () => {
    const m = await makeMember({ status: "PENDING", role: "ADMIN" });
    await expect(authorizeCredentials({ email: m.email, password: PASSWORD })).resolves.toMatchObject({ id: m.id, role: "ADMIN" });
  });
  it("keeps the generic message for a wrong password", async () => {
    const m = await makeMember({ status: "PENDING" });
    await expect(authorizeCredentials({ email: m.email, password: "wrong-password" })).rejects.toThrow(/Invalid email or password/);
  });
});
