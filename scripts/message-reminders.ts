import "../lib/load-env";

// npm run messages:remind: sends the email/SMS reminders about direct messages unread
// for over an hour (lib/message-reminders.ts) now. The live server also runs this every
// 10 minutes.
async function main() {
  const { runMessageReminders } = await import("../lib/message-reminders");
  const run = await runMessageReminders();
  console.log(`Reminded ${run.remindedMembers} member(s): ${run.emails} email(s), ${run.sms} SMS.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
