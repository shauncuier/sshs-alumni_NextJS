import crypto from "crypto";
import { contactMessageEmail } from "@/lib/email-templates";
import { NextResponse } from "next/server";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { sendEmail } from "@/lib/email";
import { requireRateLimit, readJsonBody, requireSameOrigin } from "@/lib/request-security";

const LIMITS = { name: 120, email: 254, subject: 200, message: 5000 };

const field = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// POST /api/contact — a visitor's message to the committee. It is emailed to
// CONTACT_INBOX_EMAIL (Reply-To: the sender) and kept in the activity log.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "contact", { limit: 5, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    const name = field(body.name, LIMITS.name);
    const email = field(body.email, LIMITS.email).toLowerCase();
    const subject = field(body.subject, LIMITS.subject) || "(no subject)";
    const message = field(body.message, LIMITS.message);

    if (!name || !email || !message) {
      throw new AppError("INVALID_REQUEST", 400, "Name, email, and message are required fields.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError("INVALID_REQUEST", 400, "Please enter a valid email address.");
    }

    const ticketId = `TICK-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const inbox = process.env.CONTACT_INBOX_EMAIL?.trim();
    let emailed = false;
    if (inbox) {
      const sent = await sendEmail({ to: inbox, replyTo: email, ...contactMessageEmail({ name, email, subject, message, ticketId }) });
      emailed = sent.success;
      if (!sent.success) console.error("[contact] Could not email the committee:", sent.error);
    } else {
      console.warn("[contact] CONTACT_INBOX_EMAIL is not set; the message is only in the activity log.");
    }

    await logActivity({
      category: "CONTENT",
      action: "contact.message",
      summary: `Contact form from ${name} <${email}>: ${subject.slice(0, 120)}${emailed ? "" : " (not emailed)"}`,
      actor: { email },
      targetType: "ContactMessage",
      targetId: ticketId,
      metadata: { name, email, subject, message, emailedTo: emailed ? inbox : null },
      req,
    });
    return NextResponse.json(
      {
        message: "Your message has been received by the SSGHS Alumni Association executive office. We will get back to you shortly.",
        ticketId,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("Contact API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
