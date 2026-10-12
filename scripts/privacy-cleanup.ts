import "../lib/load-env";

// npm run privacy:cleanup — deletes rejected applicants' photos, proofs and payment
// screenshots older than PRIVACY_REJECTED_DAYS (default 30). The server also runs
// this daily; use this to run it now.
async function main() {
  const { purgeRejectedApplicantFiles, rejectedRetentionDays } = await import("../lib/privacy-cleanup");
  const { users, folders } = await purgeRejectedApplicantFiles();
  console.log(`Rejected more than ${rejectedRetentionDays()} days ago: cleaned ${users} applicant(s), ${folders} folder(s) removed.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
