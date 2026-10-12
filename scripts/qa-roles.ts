import "../lib/load-env";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

/**
 * npm run qa:roles — signs in as each role against the running local dev server
 * (http://localhost:3000, or QA_BASE_URL) and checks which pages and APIs each
 * role can open. Creates one throwaway account per role (qa-<role>@example.test,
 * random passwords never printed) and deletes them at the end. Local only.
 */

const BASE = process.env.QA_BASE_URL || "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE) || process.env.NODE_ENV === "production") {
  console.error("qa:roles only runs against a local dev server.");
  process.exit(1);
}

type Role = "VISITOR" | "ALUMNI" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";
type Expect = "ok" | "login" | "forbidden";

const PUBLIC = ["/", "/events", "/news", "/gallery", "/stories", "/achievements", "/donate", "/about", "/contact", "/alumni", "/batches", "/careers", "/mentorship", "/school", "/volunteer"];
const MEMBER = ["/dashboard", "/feed", "/network", "/messages", "/profile", "/card", "/notifications", "/careers/new", "/careers/mine", "/mentorship/become", "/mentorship/mine"];
const MOD_ADMIN = ["/admin/news", "/admin/gallery", "/admin/stories", "/admin/jobs", "/admin/mentors"];
const ADMIN_ONLY = ["/admin", "/admin/verifications", "/admin/users", "/admin/logs", "/admin/donations", "/admin/events", "/admin/sms", "/admin/alumni", "/admin/volunteers", "/admin/batches"];
const APIS: [string, Record<Role, number>][] = [
  ["/api/posts", { VISITOR: 401, ALUMNI: 200, MODERATOR: 200, ADMIN: 200, SUPER_ADMIN: 200 }],
  ["/api/notifications", { VISITOR: 401, ALUMNI: 200, MODERATOR: 200, ADMIN: 200, SUPER_ADMIN: 200 }],
  ["/api/admin/news", { VISITOR: 403, ALUMNI: 403, MODERATOR: 200, ADMIN: 200, SUPER_ADMIN: 200 }],
  ["/api/admin/campaigns", { VISITOR: 403, ALUMNI: 403, MODERATOR: 403, ADMIN: 200, SUPER_ADMIN: 200 }],
  ["/api/admin/payment-settings", { VISITOR: 403, ALUMNI: 403, MODERATOR: 403, ADMIN: 200, SUPER_ADMIN: 200 }],
  ["/api/events/verify-ticket", { VISITOR: 403, ALUMNI: 403, MODERATOR: 200, ADMIN: 200, SUPER_ADMIN: 200 }],
];

function expected(role: Role, path: string): Expect {
  if (PUBLIC.includes(path)) return "ok";
  if (role === "VISITOR") return "login";
  if (MEMBER.includes(path)) return "ok";
  const staff = role === "ADMIN" || role === "SUPER_ADMIN";
  if (path === "/gate") return staff || role === "MODERATOR" ? "ok" : "forbidden";
  if (MOD_ADMIN.includes(path)) return staff || role === "MODERATOR" ? "ok" : "forbidden";
  return staff ? "ok" : "forbidden";
}

class Client {
  cookies = new Map<string, string>();
  private store(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
  }
  async fetch(path: string, init: RequestInit = {}) {
    const res = await fetch(BASE + path, {
      ...init,
      redirect: "manual",
      headers: { ...(init.headers as Record<string, string>), cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ") },
      signal: AbortSignal.timeout(120_000),
    });
    this.store(res);
    return res;
  }
  async signIn(email: string, password: string): Promise<boolean> {
    const { csrfToken } = await (await this.fetch("/api/auth/csrf")).json();
    const res = await this.fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, email, password, json: "true" }),
    });
    await res.text();
    return [...this.cookies.keys()].some((k) => k.endsWith("next-auth.session-token"));
  }
}

function classify(res: Response, path: string): Expect | string {
  const loc = res.headers.get("location") ?? "";
  if (res.status >= 300 && res.status < 400) {
    if (/\/login/.test(loc)) return "login";
    // /admin sends moderators on to their first section.
    if (path === "/admin" && /\/admin\//.test(loc)) return "forbidden";
    return `redirect ${loc}`;
  }
  if (res.status === 200) return "ok";
  if (res.status === 401) return "login";
  if (res.status === 403) return "forbidden";
  return `HTTP ${res.status}`;
}

async function main() {
  const { default: prisma } = await import("../lib/prisma");
  const roles: Exclude<Role, "VISITOR">[] = ["ALUMNI", "MODERATOR", "ADMIN", "SUPER_ADMIN"];
  const passwords = new Map<string, string>();
  const emails = [...roles.map((r) => `qa-${r.toLowerCase().replace("_", "-")}@example.test`), "qa-pending@example.test"];
  let failures = 0;
  try {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    for (const [i, role] of [...roles, "PENDING" as const].entries()) {
      const email = emails[i];
      const password = crypto.randomBytes(18).toString("base64url");
      passwords.set(email, password);
      await prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(password, 10),
          role: role === "PENDING" ? "ALUMNI" : role,
          status: role === "PENDING" ? "PENDING" : "VERIFIED",
          profile: { create: { fullName: `QA ${role}`, sscBatch: 2005, graduationYear: 2005, profession: "Tester", locationCity: "Chattogram", locationCountry: "Bangladesh", verificationStatus: role === "PENDING" ? "PENDING" : "VERIFIED" } },
        },
      });
    }

    const pendingIn = await new Client().signIn("qa-pending@example.test", passwords.get("qa-pending@example.test")!);
    console.log(`${pendingIn ? "FAIL" : "ok  "}  PENDING member cannot sign in`);
    if (pendingIn) failures++;

    for (const role of ["VISITOR", ...roles] as Role[]) {
      const client = new Client();
      if (role !== "VISITOR") {
        const email = emails[roles.indexOf(role as Exclude<Role, "VISITOR">)];
        if (!(await client.signIn(email, passwords.get(email)!))) {
          console.log(`FAIL  ${role}: could not sign in`);
          failures++;
          continue;
        }
      }
      const bad: string[] = [];
      for (const path of [...PUBLIC, ...MEMBER, "/gate", ...MOD_ADMIN, ...ADMIN_ONLY]) {
        const want = expected(role, path);
        const got = classify(await client.fetch(path), path);
        if (got !== want && !(path === "/admin" && role === "MODERATOR" && got === "forbidden")) bad.push(`${path}: expected ${want}, got ${got}`);
      }
      for (const [path, byRole] of APIS) {
        const res = await client.fetch(path);
        await res.text();
        if (res.status !== byRole[role]) bad.push(`${path}: expected HTTP ${byRole[role]}, got ${res.status}`);
      }
      console.log(`${bad.length ? "FAIL" : "ok  "}  ${role}: ${PUBLIC.length + MEMBER.length + 1 + MOD_ADMIN.length + ADMIN_ONLY.length} pages, ${APIS.length} APIs`);
      for (const b of bad) console.log(`        ${b}`);
      failures += bad.length;
    }
  } finally {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }
  console.log(failures ? `\n${failures} problem(s).` : "\nAll role checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
