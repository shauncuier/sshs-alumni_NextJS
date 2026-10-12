/**
 * SSGHS Alumni Association — Transactional Email Service
 * 
 * Supports:
 * - Nodemailer (SMTP) for self-hosted or Gmail SMTP
 * - Resend API as a modern alternative
 * 
 * The emails themselves are in lib/email-templates.ts.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/** Where replies to site emails go: EMAIL_REPLY_TO, else the association's mailbox. */
function replyToAddress(): string {
  return process.env.EMAIL_REPLY_TO || process.env.NEXT_PUBLIC_CONTACT_EMAIL || "sabujshikshayatanalumni@gmail.com";
}

// ── Email Provider Detection ──────────────────────────────────────────
// EMAIL_PROVIDER=smtp forces SMTP (e.g. Gmail with an app password) even when a
// Resend key is set; useful until the association's domain is verified in Resend.
export function getEmailProvider(): "resend" | "smtp" | "console" {
  if (process.env.EMAIL_PROVIDER === "smtp" && process.env.SMTP_HOST) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST) return "smtp";
  return "console"; // Fallback: log to console
}

/**
 * Send email via the configured provider
 */
export async function sendEmail(payload: EmailPayload): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const provider = getEmailProvider();

  switch (provider) {
    case "resend":
      return sendViaResend(payload);
    case "smtp":
      return sendViaSMTP(payload);
    case "console":
    default:
      return sendViaConsole(payload);
  }
}

/**
 * Send via Resend API (recommended for modern apps)
 */
async function sendViaResend(payload: EmailPayload) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        // Resend sends only from a domain verified in the Resend account; until
        // one is, its test sender delivers to the account owner's own address only.
        from: process.env.RESEND_FROM_EMAIL || "SSGHS Alumni <onboarding@resend.dev>",
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo || replyToAddress(),
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, messageId: data.id };
    }

    if (/verify a domain|testing emails|not verified/i.test(String(data.message))) {
      console.warn(`[Email/Resend] Not sent to a member: the sender domain is not verified in Resend (${data.message}). See docs/PRODUCTION_ENV.md.`);
    }

    return {
      success: false,
      error: data.message || "Resend API error",
    };
  } catch (error) {
    console.error("[Email/Resend] Send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send via SMTP (Nodemailer), loaded only when SMTP is the provider.
 */
async function sendViaSMTP(payload: EmailPayload) {
  try {
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from:
        process.env.SMTP_FROM || `"SSGHS Alumni Association" <${replyToAddress()}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo || replyToAddress(),
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email/SMTP] Send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown SMTP error",
    };
  }
}

/**
 * Console fallback — logs email to stdout for development
 */
async function sendViaConsole(payload: EmailPayload) {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("📧 [EMAIL PREVIEW — Console Mode]");
  console.log("═══════════════════════════════════════════════════");
  console.log(`To:      ${payload.to}`);
  console.log(`Subject: ${payload.subject}`);
  console.log(`---`);
  console.log(payload.text || "(HTML email — see html field)");
  console.log("═══════════════════════════════════════════════════\n");

  return {
    success: true,
    messageId: `console-${Date.now()}`,
  };
}

// Email designs live in lib/email-templates.ts (one layout for every email).
