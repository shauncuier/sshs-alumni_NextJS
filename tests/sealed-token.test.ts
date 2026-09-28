import { expect, it } from "vitest";
import { openJson, sealJson } from "@/lib/sealed-token";

it("round-trips a value", () => {
  const token = sealJson("purpose-a", { id: "r1" });
  expect(openJson<{ id: string }>("purpose-a", token)).toEqual({ ok: true, value: { id: "r1" } });
});

it("cannot be opened for another purpose", () => {
  const token = sealJson("purpose-a", { id: "r1" });
  expect(openJson("purpose-b", token)).toEqual({ ok: false, reason: "forged" });
});

it("rejects altered and truncated tokens", () => {
  const token = sealJson("purpose-a", { id: "r1" });
  const bytes = Buffer.from(token, "base64url");
  bytes[20] ^= 1;
  expect(openJson("purpose-a", bytes.toString("base64url"))).toEqual({ ok: false, reason: "forged" });
  expect(openJson("purpose-a", token.slice(0, 20))).toEqual({ ok: false, reason: "malformed" });
});
