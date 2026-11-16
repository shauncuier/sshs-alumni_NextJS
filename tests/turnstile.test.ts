import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireTurnstile, turnstileSiteKey } from "@/lib/turnstile";
import { POST as contact } from "@/app/api/contact/route";
import { POST as emailCode } from "@/app/api/auth/email-otp/route";
import { resetDatabase } from "./helpers/db";

type Verdict = { success: boolean; action?: string; hostname?: string; "error-codes"?: string[]; metadata?: { result_with_testing_key?: boolean } };
const calls: URLSearchParams[] = [];
let verdict: Verdict | Error = { success: true, action: "contact", hostname: "www.exsabujian.org" };

beforeEach(async () => {
  calls.length = 0;
  verdict = { success: true, action: "contact", hostname: "www.exsabujian.org" };
  vi.stubEnv("TURNSTILE_SECRET", "test-secret");
  vi.stubEnv("TURNSTILE_SITE_KEY", "");
  vi.stubEnv("TURNSTILE_HOSTNAMES", "");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.exsabujian.org");
  vi.stubGlobal("fetch", async (url: string, init: { body: URLSearchParams }) => {
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    calls.push(new URLSearchParams(init.body));
    if (verdict instanceof Error) throw verdict;
    return new Response(JSON.stringify(verdict), { status: 200, headers: { "content-type": "application/json" } });
  });
  await resetDatabase();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Turnstile robot check", () => {
  it("is off, and shows no widget, until the secret is set", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "");
    expect(turnstileSiteKey()).toBeNull();
    await expect(requireTurnstile(undefined, "contact")).resolves.toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it("serves the site's widget key once on", () => {
    expect(turnstileSiteKey()).toBe("0x4AAAAAAGCTTELzTXn4bBMG");
    vi.stubEnv("TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
    expect(turnstileSiteKey()).toBe("1x00000000000000000000AA");
  });

  it("accepts a token Cloudflare confirms for this action and our own site", async () => {
    await requireTurnstile("tok", "contact", "203.0.113.9");
    expect(calls[0].get("secret")).toBe("test-secret");
    expect(calls[0].get("response")).toBe("tok");
    expect(calls[0].get("remoteip")).toBe("203.0.113.9");
    verdict = { success: true, action: "contact", hostname: "exsabujian.org" };
    await expect(requireTurnstile("tok", "contact")).resolves.toBeUndefined();
  });

  it("refuses a missing, failed, wrong-action or other-site token, and an unreachable Cloudflare", async () => {
    const refused = { status: 403, code: "TURNSTILE_FAILED" };
    await expect(requireTurnstile(undefined, "contact")).rejects.toMatchObject(refused);
    await expect(requireTurnstile("x".repeat(2049), "contact")).rejects.toMatchObject(refused);
    expect(calls).toHaveLength(0);
    verdict = { success: false, "error-codes": ["timeout-or-duplicate"] };
    await expect(requireTurnstile("tok", "contact")).rejects.toMatchObject(refused);
    verdict = { success: true, action: "login", hostname: "www.exsabujian.org" };
    await expect(requireTurnstile("tok", "contact")).rejects.toMatchObject(refused);
    verdict = { success: true, action: "contact", hostname: "localhost" };
    await expect(requireTurnstile("tok", "contact")).rejects.toMatchObject(refused);
    verdict = new Error("network down");
    await expect(requireTurnstile("tok", "contact")).rejects.toMatchObject(refused);
  });

  it("TURNSTILE_HOSTNAMES replaces the default list", async () => {
    vi.stubEnv("TURNSTILE_HOSTNAMES", "staging.example.test");
    verdict = { success: true, action: "contact", hostname: "www.exsabujian.org" };
    await expect(requireTurnstile("tok", "contact")).rejects.toMatchObject({ code: "TURNSTILE_FAILED" });
    verdict = { success: true, action: "contact", hostname: "staging.example.test" };
    await expect(requireTurnstile("tok", "contact")).resolves.toBeUndefined();
  });

  it("Cloudflare's test keys (no action reported) work locally, never in production", async () => {
    vi.stubEnv("TURNSTILE_HOSTNAMES", "example.com");
    verdict = { success: true, hostname: "example.com", metadata: { result_with_testing_key: true } };
    await expect(requireTurnstile("tok", "contact")).resolves.toBeUndefined();
    vi.stubEnv("NODE_ENV", "production");
    await expect(requireTurnstile("tok", "contact")).rejects.toMatchObject({ code: "TURNSTILE_FAILED" });
  });

  it("the contact form and the email code are refused without a passing token", async () => {
    const post = (handler: (r: Request) => Promise<Response>, path: string, body: unknown) =>
      handler(new Request(`https://www.exsabujian.org${path}`, { method: "POST", headers: { "content-type": "application/json", origin: "https://www.exsabujian.org" }, body: JSON.stringify(body) }));
    const message = { name: "A", email: "a@example.test", message: "hello" };
    const noToken = await post(contact, "/api/contact", message);
    expect(noToken.status).toBe(403);
    expect((await noToken.json()).code).toBe("TURNSTILE_FAILED");
    expect((await post(emailCode, "/api/auth/email-otp", { email: "a@example.test" })).status).toBe(403);
    expect((await post(contact, "/api/contact", { ...message, turnstileToken: "tok" })).status).toBe(200);
  });
});
