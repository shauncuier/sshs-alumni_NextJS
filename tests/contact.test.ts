import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { resetDatabase } from "./helpers/db";

const mail = vi.hoisted(() => ({ sent: [] as { to: string; replyTo?: string; subject: string; html: string }[] }));
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...actual,
    sendEmail: async (payload: { to: string; replyTo?: string; subject: string; html: string }) => {
      mail.sent.push(payload);
      return { success: true, messageId: "m1" };
    },
  };
});

import { POST } from "@/app/api/contact/route";

beforeEach(async () => {
  mail.sent = [];
  await resetDatabase();
});
afterEach(() => vi.unstubAllEnvs());

const post = (body: unknown) => POST(new Request("http://x/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
const valid = { name: "Karim <b>", email: "Karim@Example.test", subject: "Reunion", message: "Hello <script>alert(1)</script>" };

describe("POST /api/contact", () => {
  it("emails the committee with Reply-To the sender, escaping their text, and logs it", async () => {
    vi.stubEnv("CONTACT_INBOX_EMAIL", "committee@example.test");
    const res = await post(valid);
    expect(res.status).toBe(200);
    const { ticketId } = await res.json();
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]).toMatchObject({ to: "committee@example.test", replyTo: "karim@example.test" });
    expect(mail.sent[0].subject).toContain(ticketId);
    expect(mail.sent[0].html).not.toContain("<script>");
    expect(mail.sent[0].html).toContain("&lt;script&gt;");

    const entry = await prisma.activityLog.findFirstOrThrow({ where: { action: "contact.message" } });
    expect(entry).toMatchObject({ targetId: ticketId, actorEmail: "karim@example.test" });
    expect(entry.metadata).toMatchObject({ emailedTo: "committee@example.test", message: valid.message });
  });

  it("still keeps the message in the log when no inbox is configured", async () => {
    vi.stubEnv("CONTACT_INBOX_EMAIL", "");
    expect((await post(valid)).status).toBe(200);
    expect(mail.sent).toHaveLength(0);
    const entry = await prisma.activityLog.findFirstOrThrow({ where: { action: "contact.message" } });
    expect(entry.summary).toContain("(not emailed)");
  });

  it("refuses missing fields and bad addresses", async () => {
    expect((await post({ ...valid, message: "" })).status).toBe(400);
    expect((await post({ ...valid, email: "nope" })).status).toBe(400);
    expect((await post({ ...valid, name: 42 })).status).toBe(400);
    expect(mail.sent).toHaveLength(0);
  });
});
