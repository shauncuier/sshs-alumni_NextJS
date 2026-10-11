// Runs once when a Next.js server starts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureSuperAdmin, envSuperAdminEmail } = await import("./lib/admin/super-admin");
  try {
    const result = await ensureSuperAdmin();
    if (result === "skipped") console.warn("[super-admin] SUPER_ADMIN_EMAIL is not set; no super admin account is managed.");
    else console.info(`[super-admin] ${envSuperAdminEmail()}: ${result}`);
  } catch (err) {
    // Never keep the site from starting; the account can be fixed with `npm run db:super-admin`.
    console.error("[super-admin] Could not sync the super admin account:", err instanceof Error ? err.message : err);
  }
}
