import { NextResponse } from "next/server";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { requireRateLimit, readJsonBody } from "@/lib/request-security";

export async function POST(req: Request) {
  try {
    requireRateLimit(req, "contact", { limit: 5, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required fields." },
        { status: 400 }
      );
    }

    // In production, forward to official school email or notification channel
    console.log("SSGHS Alumni Contact Message Received:", {
      name,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
    });

    // Until the form emails the committee, the log is where these messages are kept.
    await logActivity({
      category: "CONTENT",
      action: "contact.message",
      summary: `Contact form from ${name} <${email}>: ${String(subject || "(no subject)").slice(0, 120)}`,
      actor: { email: String(email) },
      metadata: { name, email, subject, message },
      req,
    });
    return NextResponse.json(
      {
        message: "Your message has been received by the SSGHS Alumni Association executive office. We will get back to you shortly.",
        ticketId: `TICK-${Date.now().toString().slice(-5)}`,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("Contact API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
