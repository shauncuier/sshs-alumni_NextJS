import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";
import { makeImage, makePdf } from "../helpers/images";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", () => ({ getSessionUser: async () => session.user, isAdminRole: () => false }));

import { POST } from "@/app/api/events/[slug]/rsvp/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});
afterAll(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});
let photo: Buffer;
beforeAll(async () => {
  photo = await makeImage(800, 800);
});

const ctx = { params: Promise.resolve({ slug: "jubilee" }) };
const multipart = (payload: string, file?: Buffer, proof?: Buffer) => {
  const form = new FormData();
  form.append("payload", payload);
  if (file) form.append("photo", new File([new Uint8Array(file)], "me.jpg", { type: "image/jpeg" }));
  if (proof) form.append("proof", new File([new Uint8Array(proof)], "certificate.pdf", { type: "application/pdf" }));
  return form;
};
const TOO_LARGE = { code: "UPLOAD_TOO_LARGE", error: "The upload is too large. The photo must be 5 MB or smaller and the proof document 10 MB or smaller." };
const joinPayload = (proof: unknown = { type: "SSC_MARKSHEET" }) =>
  JSON.stringify({
    account: { fullName: "New Member", email: "new@example.test", password: "Member-Pw-2026", sscBatch: 2001 },
    rsvp: { packageName: "General", paymentMethod: "bKash", transactionId: "TRX123456" },
    proof,
  });
const jubilee = () => makeEvent({ slug: "jubilee", isMembershipEvent: true, packages: [{ name: "General", price: 1000 }], paymentInstructions: "bKash 01XXXXXXXXX" });
const post = (form: FormData) => POST(new Request("http://x/api", { method: "POST", body: form }), ctx);

describe("POST /api/events/[slug]/rsvp uploads", () => {
  it("refuses an oversized body from Content-Length before reading it", async () => {
    const req = new Request("http://x/api", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x", "content-length": String(5 * 1024 * 1024 + 10 * 1024 * 1024 + 64 * 1024 + 1) },
      body: "--x--",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject(TOO_LARGE);
  });

  it("stops a streamed body without Content-Length once it passes the cap", async () => {
    const chunk = new Uint8Array(1024 * 1024);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        if (sent++ >= 40) return c.close();
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
    expect(await res.json()).toMatchObject(TOO_LARGE);
    // The cap is 5 MB + 10 MB + 64 KB: reading stops right after it.
    expect(sent).toBeLessThan(20);
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

  it("refuses a photo over 5 MB and a proof over 10 MB inside an allowed body", async () => {
    await jubilee();
    const bigPhoto = await post(multipart(joinPayload(), Buffer.alloc(5 * 1024 * 1024 + 1), makePdf()));
    expect(bigPhoto.status).toBe(400);
    expect(await bigPhoto.json()).toMatchObject({ code: "INVALID_PHOTO", error: "The photo must be 5 MB or smaller." });
    const bigProof = await post(multipart(joinPayload(), photo, Buffer.alloc(10 * 1024 * 1024 + 1)));
    expect(bigProof.status).toBe(400);
    expect(await bigProof.json()).toMatchObject({ code: "INVALID_PROOF", error: "The proof document must be 10 MB or smaller." });
    expect(await prisma.user.count()).toBe(0);
  });
});

describe("POST /api/events/[slug]/rsvp proof of study", () => {
  it("joins with a photo and a proof document", async () => {
    await jubilee();
    const res = await post(multipart(joinPayload({ type: "SSC_MARKSHEET", note: "Board copy" }), photo, makePdf()));
    expect(res.status).toBe(201);
    const request = await prisma.verificationRequest.findFirstOrThrow({ where: { user: { email: "new@example.test" } } });
    expect(request).toMatchObject({ proofType: "SSC_MARKSHEET", proofNote: "Board copy", proofMime: "application/pdf" });
    expect(request.proofFileUrl).toMatch(/^\/api\/media\/proofs\/[a-f0-9]{32}\/document\.pdf$/);
  });

  it("refuses a join without the proof file or its type", async () => {
    await jubilee();
    const noFile = await post(multipart(joinPayload(), photo));
    expect(noFile.status).toBe(400);
    expect((await noFile.json()).code).toBe("PROOF_REQUIRED");
    const noType = await post(multipart(joinPayload(null), photo, makePdf()));
    expect(noType.status).toBe(400);
    expect(await noType.json()).toMatchObject({ code: "INVALID_PROOF", error: "Please choose the type of document." });
    expect(await prisma.user.count()).toBe(0);
  });

  it("ignores the files a signed-in member sends", async () => {
    await jubilee();
    const member = await makeMember();
    session.user = { id: member.id, email: member.email, role: "ALUMNI" };
    const res = await post(multipart(joinPayload(), photo, makePdf()));
    expect(res.status).toBe(201);
    expect(await fs.readdir(path.join(process.env.UPLOADS_DIR!, "proofs")).catch(() => [])).toEqual([]);
    expect(await fs.readdir(path.join(process.env.UPLOADS_DIR!, "avatars")).catch(() => [])).toEqual([]);
  });
});
