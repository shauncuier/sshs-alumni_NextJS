import { schoolInfo } from "@/lib/data";

/** The crest in the email header: sent with each email as an inline image (see lib/email.ts). */
export const LOGO_CID = "ssghs-logo";

/**
 * The association's email look: one layout for every email the site sends
 * (codes, receipts, registrations, membership decisions, contact messages, job
 * and mentorship notices). Table-based with inline styles so Gmail, Outlook and
 * phone mail apps show it the same; every email also has a plain-text version.
 * Dynamic text is always HTML-escaped here; templates pass plain strings.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EmailContent {
  subject: string;
  /** Hidden one-line summary shown next to the subject in the inbox list. */
  preheader: string;
  heading: string;
  /** Plain-text paragraphs; blank lines are kept inside a paragraph. */
  paragraphs?: string[];
  /** A big code (verification emails). */
  code?: string;
  /** Label / value rows (receipts, registration details). */
  rows?: [string, string][];
  /** Text shown in a highlighted box (a quoted message, payment note). */
  quote?: string;
  button?: { label: string; url: string };
  /** Small print under the button. */
  note?: string;
}

const C = {
  green: "#064e3b",
  greenLight: "#ecfdf5",
  amber: "#fbbf24",
  ink: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  line: "#e2e8f0",
  page: "#f1f5f9",
};
const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** The site's address for links in emails (production: the real https domain). */
export function siteUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

function contactEmail(): string {
  return process.env.EMAIL_REPLY_TO || schoolInfo.associationEmail;
}

const paragraph = (text: string) =>
  `<p style="margin:0 0 14px;font:15px/1.6 ${FONT};color:${C.body};white-space:pre-line">${escapeHtml(text)}</p>`;

export function renderEmail(c: EmailContent): RenderedEmail {
  const parts: string[] = [];
  for (const p of c.paragraphs ?? []) parts.push(paragraph(p));
  if (c.code) {
    parts.push(
      `<p style="margin:8px 0 18px;text-align:center"><span style="display:inline-block;padding:14px 22px;border-radius:12px;background:${C.greenLight};border:1px solid #a7f3d0;font:700 32px/1 ${FONT};letter-spacing:8px;color:${C.green}">${escapeHtml(c.code)}</span></p>`
    );
  }
  if (c.rows && c.rows.length > 0) {
    parts.push(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:4px 0 18px">${c.rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:9px 0;border-bottom:1px solid ${C.line};font:13px ${FONT};color:${C.muted};vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:9px 0 9px 12px;border-bottom:1px solid ${C.line};font:600 14px ${FONT};color:${C.ink};text-align:right;vertical-align:top">${escapeHtml(value)}</td></tr>`
        )
        .join("")}</table>`
    );
  }
  if (c.quote) {
    parts.push(
      `<div style="margin:0 0 18px;padding:12px 16px;border-left:4px solid ${C.green};background:#f8fafc;border-radius:8px;font:14px/1.6 ${FONT};color:${C.body};white-space:pre-line">${escapeHtml(c.quote)}</div>`
    );
  }
  if (c.button) {
    parts.push(
      `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px auto 18px"><tr><td style="border-radius:10px;background:${C.green}"><a href="${escapeHtml(c.button.url)}" style="display:inline-block;padding:13px 28px;font:700 15px ${FONT};color:#ffffff;text-decoration:none;border-radius:10px">${escapeHtml(c.button.label)}</a></td></tr></table>`
    );
  }
  if (c.note) parts.push(`<p style="margin:0;font:12px/1.6 ${FONT};color:${C.muted};white-space:pre-line">${escapeHtml(c.note)}</p>`);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(c.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
  <tr><td style="background:${C.green};border-radius:16px 16px 0 0;padding:22px 28px;border-bottom:4px solid ${C.amber}">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:14px;vertical-align:middle"><img src="cid:${LOGO_CID}" width="48" height="48" alt="SSGHS" style="display:block;border-radius:50%;background:#ffffff"></td>
      <td style="vertical-align:middle">
        <div style="font:800 18px/1.2 ${FONT};color:#ffffff">Praktan Sabujian Parishad</div>
        <div style="font:12px/1.4 ${FONT};color:#a7f3d0">${escapeHtml(schoolInfo.bengaliName)}</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#ffffff;padding:30px 28px 26px;border-left:1px solid ${C.line};border-right:1px solid ${C.line}">
    <h1 style="margin:0 0 16px;font:800 22px/1.3 ${FONT};color:${C.ink}">${escapeHtml(c.heading)}</h1>
    ${parts.join("\n    ")}
  </td></tr>
  <tr><td style="background:#f8fafc;border:1px solid ${C.line};border-top:0;border-radius:0 0 16px 16px;padding:18px 28px">
    <p style="margin:0 0 6px;font:12px/1.6 ${FONT};color:${C.muted}">
      Questions? Reply to this email or write to <a href="mailto:${escapeHtml(contactEmail())}" style="color:${C.green};font-weight:700">${escapeHtml(contactEmail())}</a>.
    </p>
    <p style="margin:0;font:11px/1.6 ${FONT};color:#94a3b8">
      Praktan Sabujian Parishad · ${escapeHtml(schoolInfo.name)} · ${escapeHtml(schoolInfo.location)} · <a href="${siteUrl()}" style="color:#94a3b8">${escapeHtml(siteUrl().replace(/^https?:\/\//, ""))}</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    c.heading,
    "",
    ...(c.paragraphs ?? []).flatMap((p) => [p, ""]),
    ...(c.code ? [c.code, ""] : []),
    ...(c.rows ?? []).map(([l, v]) => `${l}: ${v}`),
    ...(c.rows?.length ? [""] : []),
    ...(c.quote ? [c.quote, ""] : []),
    ...(c.button ? [`${c.button.label}: ${c.button.url}`, ""] : []),
    ...(c.note ? [c.note, ""] : []),
    "—",
    `Praktan Sabujian Parishad · ${contactEmail()} · ${siteUrl()}`,
  ].join("\n");

  return { subject: c.subject, html, text };
}

const taka = (n: number) => `৳${Math.round(n).toLocaleString("en-US")}`;

// ── The emails ─────────────────────────────────────────────────────────

export function verificationCodeEmail(code: string, minutes: number, brand = "Praktan Sabujian Parishad"): RenderedEmail {
  return renderEmail({
    subject: `Your ${brand} verification code: ${code}`,
    preheader: `Your code is ${code}. It expires in ${minutes} minutes.`,
    heading: "Your verification code",
    paragraphs: [`Enter this code on the ${brand} website to confirm your email address:`],
    code,
    note: `The code expires in ${minutes} minutes. If you did not ask for it, you can ignore this email: nobody can use your address without the code.`,
  });
}

export interface RegistrationEmailInput {
  name: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  isMembershipEvent: boolean;
  headCount: number;
  guests: { name: string; count: number }[];
  totalFee: number;
  donationAmount: number;
  paymentMethod: string | null;
  transactionId: string | null;
  /** Link to the printable payment slip (confirmed paid registrations). */
  slipUrl?: string | null;
}

function registrationRows(r: RegistrationEmailInput): [string, string][] {
  const rows: [string, string][] = [
    ["Event", r.eventTitle],
    ["Date", r.eventDate],
    ["Venue", r.venue],
    ["People", `${r.headCount}${r.guests.length ? ` (you + ${r.guests.map((g) => `${g.name} × ${g.count}`).join(", ")})` : ""}`],
  ];
  if (r.totalFee > 0) rows.push(["Registration fee", taka(r.totalFee)]);
  if (r.donationAmount > 0) rows.push(["Donation", taka(r.donationAmount)]);
  if (r.totalFee + r.donationAmount > 0) rows.push(["Total", taka(r.totalFee + r.donationAmount)]);
  if (r.paymentMethod) rows.push(["Paid by", r.paymentMethod]);
  if (r.transactionId) rows.push(["Transaction ID", r.transactionId]);
  return rows;
}

/** Right after registering for a paid event: the committee still has to check the payment. */
export function registrationReceivedEmail(r: RegistrationEmailInput): RenderedEmail {
  return renderEmail({
    subject: `We received your registration: ${r.eventTitle}`,
    preheader: "The committee will check your payment and confirm your registration.",
    heading: "Registration received",
    paragraphs: [
      `Dear ${r.name},`,
      r.isMembershipEvent
        ? `Thank you for registering for ${r.eventTitle} and for joining Praktan Sabujian Parishad. The committee will check your payment and your details, then confirm both your registration and your membership.`
        : `Thank you for registering for ${r.eventTitle}. The committee will check your payment and confirm your registration.`,
    ],
    rows: registrationRows(r),
    note: "You will get another email when it is confirmed. Your ticket QR code then appears on your dashboard. If the payment details above are wrong, reply to this email.",
  });
}

/** The registration is confirmed (paid events after the committee's check, free events at once). */
export function registrationConfirmedEmail(r: RegistrationEmailInput): RenderedEmail {
  return renderEmail({
    subject: `You're registered: ${r.eventTitle}`,
    preheader: "Your ticket QR code is ready on your dashboard.",
    heading: "Your registration is confirmed",
    paragraphs: [
      `Dear ${r.name},`,
      `Your registration for ${r.eventTitle} is confirmed. Show the ticket QR code from your dashboard at the entrance; one ticket covers everyone on your registration.`,
      ...(r.slipUrl ? [`Your payment slip is ready to print or save: ${r.slipUrl}`] : []),
    ],
    rows: registrationRows(r),
    button: { label: "Open my ticket", url: siteUrl("/dashboard") },
  });
}

export function membershipApprovedEmail(name: string, batch: number | null): RenderedEmail {
  return renderEmail({
    subject: "Welcome to Praktan Sabujian Parishad",
    preheader: "Your membership is approved.",
    heading: "Your membership is approved",
    paragraphs: [
      `Dear ${name}${batch ? ` (SSC ${batch})` : ""},`,
      "Welcome to Praktan Sabujian Parishad. The committee has checked your details, and your membership is approved.",
      "You can now find your batchmates in the alumni directory, use your digital alumni card, post in the community feed, and register for events.",
    ],
    button: { label: "Open my dashboard", url: siteUrl("/dashboard") },
  });
}

export function membershipRejectedEmail(name: string): RenderedEmail {
  return renderEmail({
    subject: "About your Praktan Sabujian Parishad membership application",
    preheader: "The committee could not approve your application.",
    heading: "Your application was not approved",
    paragraphs: [
      `Dear ${name},`,
      "The committee could not approve your membership application, for example because your details or proof of study could not be confirmed, or the payment did not arrive.",
      "If you think this is a mistake, reply to this email with your SSC batch and any proof you have, and the committee will look at it again.",
    ],
  });
}

export function donationReceiptEmail(d: {
  donorName: string;
  amount: number;
  campaignTitle: string;
  receiptId: string;
  paymentMethod: string;
  transactionRef: string;
}): RenderedEmail {
  return renderEmail({
    subject: `Thank you for your donation: receipt ${d.receiptId}`,
    preheader: `${taka(d.amount)} for ${d.campaignTitle}, checked by the committee.`,
    heading: "Thank you for giving back",
    paragraphs: [`Dear ${d.donorName},`, `Your donation to ${d.campaignTitle} has been checked by the committee and added to the campaign. Thank you for supporting our school.`],
    rows: [
      ["Receipt", d.receiptId],
      ["Amount", taka(d.amount)],
      ["Campaign", d.campaignTitle],
      ["Paid by", d.paymentMethod],
      ...(d.transactionRef ? ([["Transaction ID", d.transactionRef]] as [string, string][]) : []),
    ],
    note: "Keep this email as your receipt.",
  });
}

/** Contact form message, to the committee's inbox (Reply-To: the sender). */
export function contactMessageEmail(m: { name: string; email: string; phone?: string | null; subject: string; message: string; ticketId: string }): RenderedEmail {
  return renderEmail({
    subject: `[Contact ${m.ticketId}] ${m.subject}`,
    preheader: `${m.name}: ${m.message.slice(0, 90)}`,
    heading: m.subject,
    rows: [
      ["From", `${m.name} <${m.email}>`],
      ...(m.phone ? ([["Phone", m.phone]] as [string, string][]) : []),
      ["Reference", m.ticketId],
    ],
    quote: m.message,
    note: `Reply to this email to answer ${m.name} directly.`,
  });
}

/** A short notice: job applications, mentorship requests and replies. */
export function noticeEmail(n: { subject: string; heading: string; paragraphs: string[]; rows?: [string, string][]; quote?: string; button?: { label: string; url: string } }): RenderedEmail {
  return renderEmail({ ...n, preheader: n.paragraphs[0] ?? n.heading });
}
