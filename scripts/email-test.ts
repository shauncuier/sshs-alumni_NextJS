import "../lib/load-env";

// npm run email:test -- <address> — sends one test email through the configured
// provider (Resend, SMTP, or the console) and prints the result.
async function main() {
  const to = process.argv[2];
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.error("Usage: npm run email:test -- you@example.com");
    process.exit(1);
  }
  const { getEmailProvider, sendEmail } = await import("../lib/email");
  console.log(`Provider: ${getEmailProvider()}; sender: ${process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || "(default)"}`);
  const result = await sendEmail({
    to,
    subject: "SSGHS Alumni: test email",
    html: "<p>This is a test email from the SSGHS Alumni platform. If you can read it, email sending works.</p>",
    text: "This is a test email from the SSGHS Alumni platform. If you can read it, email sending works.",
  });
  console.log(result.success ? `Sent (id ${result.messageId}).` : `Not sent: ${result.error}`);
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
