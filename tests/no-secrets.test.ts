import { execSync } from "node:child_process";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

// A remote database password was once committed in a script (2026-10-12). This
// fails if any tracked file holds what looks like a real credential again.
const PATTERNS: [string, RegExp][] = [
  ["database URL with a password for a non-local host", /mysql:\/\/[^:\s"'`/]+:[^@\s"'`]+@(?!localhost|127\.0\.0\.1|\[::1\])[a-z0-9.-]+/i],
  ["hardcoded password in a connection or config object", /\bpassword\s*:\s*["'`][^"'`$\s]{8,}["'`]/i],
  ["Resend API key", /\bre_[A-Za-z0-9_]{20,}\b/],
  ["private key", /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/],
];

// Test fixtures use made-up local passwords on purpose.
const IGNORED = /^(tests\/|package-lock\.json$|docs\/)/;

describe("tracked files", () => {
  it("contain no credentials", () => {
    const files = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter((f) => f && !IGNORED.test(f) && fs.existsSync(f));
    const hits: string[] = [];
    for (const file of files) {
      if (!/\.(ts|tsx|js|mjs|cjs|json|env|example|md|yml|yaml|sh|sql|txt)$/.test(file) && !file.startsWith(".env")) continue;
      const text = fs.readFileSync(file, "utf8");
      for (const [what, re] of PATTERNS) if (re.test(text)) hits.push(`${file}: ${what}`);
    }
    expect(hits).toEqual([]);
  });
});
