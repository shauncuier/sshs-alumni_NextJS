import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { makeEvent, resetDatabase } from "../helpers/db";
import { makeImage } from "../helpers/images";

vi.mock("@/lib/session-user", () => ({ getSessionUser: async () => null, isAdminRole: () => false }));

import { POST } from "@/app/api/events/[slug]/rsvp/route";

beforeEach(resetDatabase);
let photo: Buffer;
beforeAll(async () => {
  photo = await makeImage(800, 800);
});

const ctx = { params: Promise.resolve({ slug: "jubilee" }) };
const multipart = (payload: string, file?: Buffer) => {
  const form = new FormData();
  form.append("payload", payload);
  if (file) form.append("photo", new File([new Uint8Array(file)], "me.jpg", { type: "image/jpeg" }));
  return form;
};

describe("POST /api/events/[slug]/rsvp uploads", () => {
  it("refuses an oversized body from Content-Length before reading it", async () => {
    const req = new Request("http://x/api", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x", "content-length": String(200 * 1024 * 1024) },
      body: "--x--",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "INVALID_PHOTO", error: "The photo must be 5 MB or smaller." });
  });

  it("stops a streamed body without Content-Length once it passes the cap", async () => {
    const chunk = new Uint8Array(1024 * 1024);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        if (sent++ >= 20) return c.close();
        c.enqueue(chunk);
      },
    });
    const req = new Request("http://x/api", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x" },
      body,
      duplex: "half",
    } as RequestInit);
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVALID_PHOTO");
    expect(sent).toBeLessThan(10);
  });

  it("answers malformed input with 400 INVALID_REQUEST", async () => {
    await makeEvent({ slug: "jubilee", isMembershipEvent: true });
    for (const payload of ["{not json", "[]", "null"]) {
      const res = await POST(new Request("http://x/api", { method: "POST", body: multipart(payload, photo) }), ctx);
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("INVALID_REQUEST");
    }
    const bad = await POST(new Request("http://x/api", { method: "POST", headers: { "content-type": "multipart/form-data; boundary=x" }, body: "garbage" }), ctx);
    expect(bad.status).toBe(400);
    const json = await POST(new Request("http://x/api", { method: "POST", headers: { "content-type": "application/json" }, body: "{oops" }), ctx);
    expect(json.status).toBe(400);
  });
});
