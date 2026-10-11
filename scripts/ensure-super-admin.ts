import "../lib/load-env";

// Creates or syncs the super admin from SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD.
// The server also does this at startup; run this to apply it without a restart.
async function main() {
  const { ensureSuperAdmin, envSuperAdminEmail } = await import("../lib/admin/super-admin");
  const result = await ensureSuperAdmin();
  console.log(result === "skipped" ? "SUPER_ADMIN_EMAIL is not set; nothing to do." : `${envSuperAdminEmail()}: ${result}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
