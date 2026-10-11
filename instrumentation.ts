// Runs once when a Next.js server starts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureSuperAdmin, envSuperAdminEmail } = await import("./lib/admin/super-admin");
  const { logActivity, pruneActivityLog } = await import("./lib/activity-log");
  try {
    const result = await ensureSuperAdmin();
    if (result === "skipped") console.warn("[super-admin] SUPER_ADMIN_EMAIL is not set; no super admin account is managed.");
    else console.info(`[super-admin] ${envSuperAdminEmail()}: ${result}`);
    if (result === "created" || result === "updated") {
      await logActivity({ category: "SYSTEM", action: `super_admin.${result}`, summary: `Super admin ${envSuperAdminEmail()} ${result} from the server environment`, actor: { email: envSuperAdminEmail(), role: "SUPER_ADMIN" } });
    }
  } catch (err) {
    // Never keep the site from starting; the account can be fixed with `npm run db:super-admin`.
    console.error("[super-admin] Could not sync the super admin account:", err instanceof Error ? err.message : err);
    await logActivity({ category: "SYSTEM", action: "super_admin.sync_failed", status: "FAILURE", summary: `Super admin sync failed: ${err instanceof Error ? err.message : "error"}` });
  }
  try {
    const removed = await pruneActivityLog();
    if (removed > 0) await logActivity({ category: "SYSTEM", action: "log.pruned", summary: `Removed ${removed} activity log entries older than the retention period` });
  } catch (err) {
    console.error("[activity-log] Could not prune old entries:", err instanceof Error ? err.message : err);
  }
}
