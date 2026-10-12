/**
 * Checks a production environment before the site serves anyone. Errors are
 * settings the site must not run without (it refuses to start); warnings are
 * features that will not work yet. Messages name variables, never their values.
 */

type Env = Record<string, string | undefined>;

export interface EnvReport {
  errors: string[];
  warnings: string[];
}

// Secrets that have been published (in .env.example or this repository's history).
const PUBLIC_SECRETS = new Set(["sabuj-shikshayatan-alumni-production-secret-key-2026"]);
export const MIN_SECRET_LENGTH = 32;

const set = (env: Env, name: string) => Boolean(env[name]?.trim());

function httpsUrl(value: string | undefined): URL | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function checkProductionEnv(env: Env): EnvReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Must have
  if (!set(env, "DATABASE_URL")) errors.push("DATABASE_URL is not set.");

  const secret = env.NEXTAUTH_SECRET?.trim() ?? "";
  if (!secret) errors.push("NEXTAUTH_SECRET is not set. Generate one with: openssl rand -base64 32");
  else if (PUBLIC_SECRETS.has(secret)) errors.push("NEXTAUTH_SECRET is the published example value. Generate a new one with: openssl rand -base64 32");
  else if (secret.length < MIN_SECRET_LENGTH) errors.push(`NEXTAUTH_SECRET is too short (at least ${MIN_SECRET_LENGTH} characters). Generate one with: openssl rand -base64 32`);

  const authUrl = httpsUrl(env.NEXTAUTH_URL);
  const appUrl = httpsUrl(env.NEXT_PUBLIC_APP_URL);
  if (!authUrl) errors.push("NEXTAUTH_URL must be the site's https:// address.");
  if (!appUrl) errors.push("NEXT_PUBLIC_APP_URL must be the site's https:// address.");
  if (authUrl && appUrl && authUrl.origin !== appUrl.origin) errors.push("NEXTAUTH_URL and NEXT_PUBLIC_APP_URL must be the same address.");
  for (const name of ["NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"]) {
    if (/localhost|127\.0\.0\.1|192\.168\./.test(env[name] ?? "")) errors.push(`${name} points to a local address.`);
  }

  if (!set(env, "SUPER_ADMIN_EMAIL")) errors.push("SUPER_ADMIN_EMAIL is not set: the site needs its super admin.");
  const superPw = env.SUPER_ADMIN_PASSWORD ?? "";
  if (superPw.length < 12) errors.push("SUPER_ADMIN_PASSWORD must be at least 12 characters.");
  if (secret && superPw && superPw === secret) errors.push("SUPER_ADMIN_PASSWORD must not be the same as NEXTAUTH_SECRET.");

  if (env.ONLINE_PAYMENTS_ENABLED === "true") {
    errors.push("ONLINE_PAYMENTS_ENABLED is true, but launch uses manual payment only (roadmap step 5). Set it to false.");
  }

  // Should not be there
  for (const name of ["SEED_ADMIN_PASSWORD", "SEED_MODERATOR_PASSWORD", "SEED_ALUMNI_PASSWORD"]) {
    if (set(env, name)) warnings.push(`${name} is set. Test accounts are for local development; remove it from the production environment.`);
  }
  if (set(env, "TEST_DATABASE_URL")) warnings.push("TEST_DATABASE_URL is set; it is only used by the test suite.");

  // Features that will not work yet
  if (!set(env, "RESEND_API_KEY") && !set(env, "SMTP_HOST")) {
    warnings.push("No email provider (RESEND_API_KEY or SMTP_HOST): email codes, receipts and notices will not be sent (roadmap step 17).");
  }
  if (!set(env, "BULKSMSBD_API_KEY") || !set(env, "BULKSMSBD_SENDER_ID")) {
    warnings.push("BULKSMSBD_API_KEY / BULKSMSBD_SENDER_ID not set: SMS codes and broadcasts will not be sent (roadmap step 18).");
  }
  const from = env.RESEND_FROM_EMAIL ?? "";
  if (set(env, "RESEND_API_KEY") && /@(resend\.dev|gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)\b/i.test(from || "@resend.dev")) {
    warnings.push("RESEND_FROM_EMAIL is not on a domain verified in Resend: emails reach only the Resend account owner, not members. Verify the association's domain in Resend (roadmap step 17).");
  }
  if (!set(env, "CONTACT_INBOX_EMAIL")) warnings.push("CONTACT_INBOX_EMAIL not set: contact-form messages are kept only in the activity log.");
  // bKash / Nagad / bank / Bangla QR / cash are set in Admin → Payment settings, not here.
  const uploads = env.UPLOADS_DIR?.trim() ?? "";
  if (!uploads || !(uploads.startsWith("/") || /^[A-Za-z]:[\\/]/.test(uploads))) {
    warnings.push("UPLOADS_DIR should be an absolute path outside the app folder, so uploads survive redeploys and are backed up.");
  }
  const retention = Number(env.LOG_RETENTION_DAYS ?? "365");
  if (!Number.isInteger(retention) || retention < 30) warnings.push("LOG_RETENTION_DAYS should be a whole number of days, at least 30.");

  return { errors, warnings };
}
