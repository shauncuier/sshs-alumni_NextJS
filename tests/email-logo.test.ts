import { afterEach, describe, expect, it, vi } from "vitest";
import { LOGO_CID, sendEmail } from "@/lib/email";
import { verificationCodeEmail } from "@/lib/email-templates";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("the crest in emails", () => {
  it("is sent with the email as an inline image, not a link to the website", async () => {
    const email = verificationCodeEmail("482913", 10);
    expect(email.html).toContain(`src="cid:${LOGO_CID}"`);
    expect(email.html).not.toContain("/logo.png");

    vi.stubEnv("EMAIL_PROVIDER", "");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetchMock = vi.fn<(url: string, init: { body: string }) => Promise<Response>>(async () => new Response(JSON.stringify({ id: "m1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({ to: "a@example.test", ...email });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.attachments).toEqual([
      { filename: "logo.png", content: expect.stringMatching(/^iVBORw0KGgo/), content_type: "image/png", content_id: LOGO_CID },
    ]);
  });

  it("is not attached to an email that does not show it", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetchMock = vi.fn<(url: string, init: { body: string }) => Promise<Response>>(async () => new Response(JSON.stringify({ id: "m2" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendEmail({ to: "a@example.test", subject: "s", html: "<p>plain</p>", text: "plain" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("attachments");
  });
});
