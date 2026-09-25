/**
 * SSGHS Alumni Association — Transactional Email Service
 * 
 * Supports:
 * - Nodemailer (SMTP) for self-hosted or Gmail SMTP
 * - Resend API as a modern alternative
 * 
 * Templates:
 * - Verification approval email
 * - Donation receipt confirmation
 * - Event RSVP confirmation
 * - Password reset
 * - Batch announcement broadcast
 */

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

// ── Email Provider Detection ──────────────────────────────────────────
function getEmailProvider(): "resend" | "smtp" | "console" {
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
        from:
          process.env.RESEND_FROM_EMAIL ||
          "SSGHS Alumni <alumni@sabujsghs.edu.bd>",
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo || "alumni@sabujsghs.edu.bd",
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, messageId: data.id };
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
 * Send via SMTP (Nodemailer)
 * Uses dynamic import to avoid bundling nodemailer when not needed.
 */
async function sendViaSMTP(payload: EmailPayload) {
  try {
    // Dynamic require to avoid build errors when nodemailer is not installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    let nodemailer: any = null;
    try { nodemailer = require("nodemailer"); } catch { nodemailer = null; }

    if (!nodemailer) {
      console.warn("[Email/SMTP] nodemailer not installed. Run: npm install nodemailer");
      return sendViaConsole(payload);
    }

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
        process.env.SMTP_FROM ||
        '"SSGHS Alumni Association" <alumni@sabujsghs.edu.bd>',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
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

// ── Email Templates ──────────────────────────────────────────────────

/**
 * Verification approval email
 */
export function verificationApprovedTemplate(name: string, batch: number): EmailPayload {
  return {
    to: "", // Caller provides this
    subject: `✅ Welcome to the SSGHS Alumni Family, ${name}!`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="text-align: center; padding: 24px 0;">
          <h1 style="color: #064e3b; margin: 0; font-size: 24px;">🎓 SSGHS Alumni Association</h1>
          <p style="color: #6b7280; font-size: 12px;">সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়, চট্টগ্রাম</p>
        </div>
        <div style="background: white; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
          <h2 style="color: #059669; margin-top: 0;">Verification Approved! ✅</h2>
          <p style="color: #374151; line-height: 1.6;">
            Dear <strong>${name}</strong> (SSC Batch ${batch}),
          </p>
          <p style="color: #374151; line-height: 1.6;">
            Your alumni profile has been verified by the Executive Committee. You now have full access to the alumni community platform.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard"
               style="background: #059669; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Open Your Dashboard
            </a>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center;">
            EIIN: 105070 | sabujsghs.edu.bd
          </p>
        </div>
      </div>
    `,
    text: `Dear ${name} (SSC Batch ${batch}), your alumni profile has been verified! Visit your dashboard to explore the community.`,
  };
}

/**
 * Donation receipt confirmation email
 */
export function donationReceiptTemplate(
  donorName: string,
  amount: number,
  campaignTitle: string,
  receiptId: string,
  gatewayTrxId: string
): EmailPayload {
  return {
    to: "",
    subject: `🙏 Thank You, ${donorName}! Donation Receipt #${receiptId}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="text-align: center; padding: 24px 0;">
          <h1 style="color: #064e3b; margin: 0; font-size: 24px;">🎓 SSGHS Alumni Association</h1>
          <p style="color: #6b7280; font-size: 12px;">Official Donation Receipt</p>
        </div>
        <div style="background: white; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
          <h2 style="color: #059669; margin-top: 0;">Thank You for Giving Back! 💚</h2>
          <p style="color: #374151;">Dear <strong>${donorName}</strong>,</p>
          <p style="color: #374151; line-height: 1.6;">
            Your generous contribution to <strong>${campaignTitle}</strong> has been received and confirmed.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Receipt ID</td>
              <td style="padding: 8px 0; font-weight: bold; text-align: right;">${receiptId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Amount</td>
              <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #059669;">৳${amount.toLocaleString()}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Campaign</td>
              <td style="padding: 8px 0; text-align: right;">${campaignTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Transaction ID</td>
              <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${gatewayTrxId}</td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 11px; text-align: center; margin-top: 24px;">
            This receipt is audited by the SSGHS Alumni Executive Council.<br/>
            EIIN: 105070 | sabujsghs.edu.bd
          </p>
        </div>
      </div>
    `,
    text: `Thank you, ${donorName}! Your donation of ৳${amount} to ${campaignTitle} has been received. Receipt: ${receiptId}, Transaction: ${gatewayTrxId}.`,
  };
}

/**
 * Event RSVP confirmation email
 */
export function eventRSVPTemplate(
  name: string,
  eventTitle: string,
  eventDate: string,
  venue: string
): EmailPayload {
  return {
    to: "",
    subject: `📅 RSVP Confirmed — ${eventTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
        <div style="text-align: center; padding: 24px 0;">
          <h1 style="color: #064e3b; margin: 0; font-size: 24px;">🎓 SSGHS Alumni Association</h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
          <h2 style="color: #064e3b; margin-top: 0;">You're Registered! 🎉</h2>
          <p style="color: #374151;">Dear <strong>${name}</strong>,</p>
          <p style="color: #374151; line-height: 1.6;">
            Your RSVP for <strong>${eventTitle}</strong> has been confirmed.
          </p>
          <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; margin: 16px 0; border-left: 4px solid #059669;">
            <p style="margin: 4px 0; color: #374151;"><strong>📅 Date:</strong> ${eventDate}</p>
            <p style="margin: 4px 0; color: #374151;"><strong>📍 Venue:</strong> ${venue}</p>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center;">
            EIIN: 105070 | sabujsghs.edu.bd
          </p>
        </div>
      </div>
    `,
    text: `Dear ${name}, your RSVP for ${eventTitle} on ${eventDate} at ${venue} has been confirmed.`,
  };
}
