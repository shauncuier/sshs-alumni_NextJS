import "../lib/load-env";

// npm run email:test -- <address> [email name] — sends one email through the
// configured provider (Resend, SMTP, or the console) and prints the result.
// Without a name it sends a short test in the site's email layout; with one of the
// names from `npm run email:preview` (e.g. registration-confirmed) it sends that
// email with sample values.
async function main() {
  const to = process.argv[2];
  const name = process.argv[3];
  const { EMAIL_SAMPLES } = await import("../lib/email-samples");
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || (name && !EMAIL_SAMPLES[name])) {
    console.error(`Usage: npm run email:test -- you@example.com [${Object.keys(EMAIL_SAMPLES).join(" | ")}]`);
    process.exit(1);
  }
  const { getEmailProvider, sendEmail } = await import("../lib/email");
  const { renderEmail } = await import("../lib/email-templates");
  const provider = getEmailProvider();
  const sender = provider === "smtp" ? process.env.SMTP_FROM || process.env.SMTP_USER : provider === "resend" ? process.env.RESEND_FROM_EMAIL : "(console only, nothing is sent)";
  console.log(`Provider: ${provider}; sender: ${sender || "(default)"}`);
  const email = name
    ? EMAIL_SAMPLES[name]()
    : renderEmail({
        subject: "Praktan Sabujian Parishad: test email",
        preheader: "If you can read this, email sending works.",
        heading: "Test email",
        paragraphs: ["This is a test email from the Praktan Sabujian Parishad website. If you can read it, email sending works."],
      });
  const result = await sendEmail({ to, ...email });
  console.log(result.success ? `Sent "${email.subject}" (id ${result.messageId}).` : `Not sent: ${result.error}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
