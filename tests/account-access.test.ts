import { describe, expect, it } from "vitest";
import { accountAccessBlock, MEMBERSHIP_REJECTED_MESSAGE, PENDING_APPROVAL_MESSAGE } from "@/lib/account-access";

describe("accountAccessBlock", () => {
  it("blocks pending and rejected members", () => {
    expect(accountAccessBlock({ role: "ALUMNI", status: "PENDING" })).toEqual({ code: "PENDING_APPROVAL", message: PENDING_APPROVAL_MESSAGE });
    expect(accountAccessBlock({ role: "ALUMNI", status: "REJECTED" })).toEqual({ code: "MEMBERSHIP_REJECTED", message: MEMBERSHIP_REJECTED_MESSAGE });
  });
  it("lets verified members through", () => {
    expect(accountAccessBlock({ role: "ALUMNI", status: "VERIFIED" })).toBeNull();
  });
  it("never blocks staff", () => {
    for (const role of ["ADMIN", "SUPER_ADMIN", "MODERATOR"]) {
      expect(accountAccessBlock({ role, status: "PENDING" })).toBeNull();
      expect(accountAccessBlock({ role, status: "REJECTED" })).toBeNull();
    }
  });
});
