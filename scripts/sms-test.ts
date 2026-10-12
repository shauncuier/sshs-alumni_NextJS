import "../lib/load-env";

// npm run sms:test -- 01XXXXXXXXX — sends one SMS in the exact OTP template
// ("Your {Brand} OTP is 1234", brand from OTP_BRAND_NAME) through BulkSMSBD and
// prints the gateway's answer and the balance. Costs one SMS credit. Use it to
// confirm the template and sender ID are approved, on each operator.
async function main() {
  const phone = process.argv[2];
  const { checkBulkSmsBalance, getBulkSmsErrorMessage, normalizeBdPhoneNumber, sendBulkSms } = await import("../lib/bulksmsbd");
  const normalized = phone ? normalizeBdPhoneNumber(phone) : null;
  if (!normalized) {
    console.error("Usage: npm run sms:test -- 01XXXXXXXXX");
    process.exit(1);
  }
  const brand = process.env.OTP_BRAND_NAME?.trim() || "SSGHS Alumni";
  const message = `Your ${brand} OTP is 1234`;
  console.log(`Sending "${message}" to ${normalized} (sender ID ${process.env.BULKSMSBD_SENDER_ID || "not set"})...`);
  const r = await sendBulkSms({ numbers: [normalized], message });
  if (r.isSimulated) console.log("Simulated only: BULKSMSBD_API_KEY is not set.");
  const code = Number(r.responseCode);
  console.log(r.success ? `Accepted by BulkSMSBD (code ${r.responseCode}).` : `Refused: ${r.error || (Number.isFinite(code) ? getBulkSmsErrorMessage(code) : r.message)}`);
  const balance = await checkBulkSmsBalance();
  if (balance.success) console.log(`Balance: ${balance.balance} ${balance.currency ?? ""}`);
  process.exit(r.success ? 0 : 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
