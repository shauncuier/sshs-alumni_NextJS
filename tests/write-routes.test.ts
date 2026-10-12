import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { JSON_BODY_BYTES, readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { POST as createPost } from "@/app/api/posts/route";
import { PATCH as markRead } from "@/app/api/messages/route";

// Routes that may skip the same-origin check, and why.
const EXEMPT: Record<string, string> = {
  "app/api/payments/sslcommerz/success/route.ts": "posted by the payment gateway",
  "app/api/payments/sslcommerz/fail/route.ts": "posted by the payment gateway",
  "app/api/payments/sslcommerz/cancel/route.ts": "posted by the payment gateway",
  "app/api/payments/sslcommerz/ipn/route.ts": "server-to-server notification from the gateway",
  "app/api/auth/register/route.ts": "always answers 410; changes nothing",
};

function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? routeFiles(p) : e.name === "route.ts" ? [p.split(path.sep).join("/")] : [];
  });
}

describe("every write route", () => {
  const writeRoutes = routeFiles("app/api").filter((f) => /export\s+(async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b/.test(fs.readFileSync(f, "utf8")));

  it("checks the request comes from this site, unless listed as exempt", () => {
    expect(writeRoutes.length).toBeGreaterThan(50);
    const missing = writeRoutes.filter((f) => !EXEMPT[f] && !fs.readFileSync(f, "utf8").includes("requireSameOrigin(req"));
    expect(missing).toEqual([]);
  });

  it("writes to the activity log, unless listed as exempt", () => {
    const NOT_LOGGED: Record<string, string> = {
      "app/api/auth/register/route.ts": "always answers 410; changes nothing",
      "app/api/media/ocr/route.ts": "reads text from an image; changes nothing",
      "app/api/payments/sslcommerz/ipn/route.ts": "logged inside lib/payments/finalize.ts",
      "app/api/payments/sslcommerz/success/route.ts": "logged inside lib/payments/finalize.ts",
      "app/api/posts/[id]/like/route.ts": "likes are too frequent to log; the count is on the post",
    };
    const silent = writeRoutes.filter((f) => !NOT_LOGGED[f] && !/logActivity|logFailure/.test(fs.readFileSync(f, "utf8")));
    expect(silent).toEqual([]);
  });

  it("never reads a request body without a size cap", () => {
    const unbounded = writeRoutes.filter((f) => /\breq(uest)?\.(json|text|formData|arrayBuffer)\(\)/.test(fs.readFileSync(f, "utf8")));
    expect(unbounded).toEqual([]);
  });
});

describe("same-origin check", () => {
  const req = (headers: Record<string, string>) => new Request("http://alumni.test/api/x", { method: "POST", headers: { host: "alumni.test", ...headers } });

  it("allows this site and requests without an Origin, refuses other sites", () => {
    expect(() => requireSameOrigin(req({ origin: "http://alumni.test" }))).not.toThrow();
    expect(() => requireSameOrigin(req({}))).not.toThrow();
    expect(() => requireSameOrigin(req({ origin: "https://evil.example" }))).toThrow(expect.objectContaining({ status: 403 }));
    expect(() => requireSameOrigin(req({ origin: "null" }))).toThrow(expect.objectContaining({ status: 403 }));
    expect(() => requireSameOrigin(req({ "sec-fetch-site": "cross-site" }))).toThrow(expect.objectContaining({ status: 403 }));
  });
});

describe("JSON bodies", () => {
  const body = (text: string, headers: Record<string, string> = {}) => new Request("http://x", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: text });

  it("reads objects, refuses malformed or non-object bodies with 400 and oversized ones with 413", async () => {
    await expect(readJsonBody(body('{"a":1}'))).resolves.toEqual({ a: 1 });
    await expect(readJsonBody(body("{oops"))).rejects.toMatchObject({ status: 400 });
    await expect(readJsonBody(body("[1,2]"))).rejects.toMatchObject({ status: 400 });
    await expect(readJsonBody(body(""))).rejects.toMatchObject({ status: 400 });
    const big = JSON.stringify({ text: "x".repeat(JSON_BODY_BYTES) });
    await expect(readJsonBody(body(big))).rejects.toMatchObject({ status: 413 });
    await expect(readJsonBody(body(big), 2 * JSON_BODY_BYTES)).resolves.toBeTruthy();
    // A lying Content-Length is refused before reading.
    await expect(readJsonBody(body("{}", { "content-length": String(10 * JSON_BODY_BYTES) }))).rejects.toMatchObject({ status: 413 });
  });
});

describe("routes refuse cross-site requests", () => {
  beforeEach(async () => {
    session.user = null;
    await resetDatabase();
  });

  it("a signed-in member's browser cannot be made to post or change state from another site", async () => {
    const m = await makeMember();
    session.user = { id: m.id, email: m.email, role: "ALUMNI" };
    const evil = (method: string) =>
      new Request("http://alumni.test/api/x", { method, headers: { host: "alumni.test", origin: "https://evil.example", "content-type": "application/json" }, body: JSON.stringify({ content: "Spam" }) });
    expect((await createPost(evil("POST"))).status).toBe(403);
    expect((await markRead(evil("PATCH") as never)).status).toBe(403);
  });
});
