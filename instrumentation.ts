// Runs once when a Next.js server starts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV === "production") {
    const { checkProductionEnv } = await import("./lib/env-check");
    const { errors, warnings } = checkProductionEnv(process.env);
    for (const w of warnings) console.warn(`[env] ${w}`);
    for (const e of errors) console.error(`[env] ${e}`);
    // A public site must not run with a published secret or without its super admin.
    // A production build started on this machine (localhost URL) only gets the messages.
    const local = /localhost|127\.0\.0\.1/.test(process.env.NEXT_PUBLIC_APP_URL ?? "localhost");
    if (errors.length > 0 && !local) {
      throw new Error(`Refusing to start: ${errors.length} production setting(s) missing or unsafe (see [env] lines above). Check with: npm run env:check`);
    }
  }
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
  // Privacy: rejected applicants' photos, proofs and payment screenshots go after
  // PRIVACY_REJECTED_DAYS. A minute after start (not delaying it), then daily.
  const { purgeRejectedApplicantFiles } = await import("./lib/privacy-cleanup");
  const purge = () =>
    purgeRejectedApplicantFiles().catch((err) => console.error("[privacy] Clean-up failed:", err instanceof Error ? err.message : err));
  setTimeout(purge, 60_000).unref();
  setInterval(purge, 24 * 60 * 60_000).unref();

  // Email/SMS about direct messages unread for an hour (lib/message-reminders.ts): two
  // minutes after start, then every 10 minutes. Only on the live site (or with
  // MESSAGE_REMINDERS=on), so a development server never writes to real members.
  // Database watchdog (lib/db-watchdog.ts): reads one table every 3 minutes and alerts the
  // super admin by email and SMS when the host drops the database permissions. Live site
  // only (or DB_WATCHDOG=on).
  if (process.env.NODE_ENV === "production" || process.env.DB_WATCHDOG === "on") {
    const { runDbWatchdog, pruneWatchdogMarkers } = await import("./lib/db-watchdog");
    const state = { failures: 0 };
    const watch = () => {
      void runDbWatchdog(state);
    };
    setTimeout(watch, 30_000).unref();
    setInterval(watch, 3 * 60_000).unref();
    setInterval(() => void pruneWatchdogMarkers(), 24 * 60 * 60_000).unref();
  }

  // Standby copy (lib/standby-sync.ts): when STANDBY_DATABASE_URL is set, copies what
  // changed to the standby database every 10 minutes (one server process per run), so the
  // site can switch to it read-only if the main database fails (lib/db-mode.ts). Live
  // site only, or STANDBY_SYNC=on on a development server.
  if (process.env.STANDBY_DATABASE_URL?.trim() && (process.env.NODE_ENV === "production" || process.env.STANDBY_SYNC === "on")) {
    const { runStandbySync, pruneStandbySyncMarkers } = await import("./lib/standby-sync");
    const copy = () => {
      void runStandbySync({ claimSlot: true });
    };
    setTimeout(copy, 90_000).unref();
    setInterval(copy, 10 * 60_000).unref();
    setInterval(() => void pruneStandbySyncMarkers(), 24 * 60 * 60_000).unref();
  }

  if (process.env.NODE_ENV === "production" || process.env.MESSAGE_REMINDERS === "on") {
    const { runMessageReminders } = await import("./lib/message-reminders");
    const remind = () => {
      void runMessageReminders();
    };
    setTimeout(remind, 2 * 60_000).unref();
    setInterval(remind, 10 * 60_000).unref();
  }
}
