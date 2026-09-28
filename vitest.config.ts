import { defineConfig } from "vitest/config";
import path from "node:path";
import dotenv from "dotenv";

// Local dev secrets/config live in .env.local (git-ignored); .env is the
// production fallback. Load .env.local first so it wins, matching how
// Next.js resolves env files. Neither file overrides a variable that is
// already set in the shell.
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const rawTestDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!rawTestDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Add it to .env.local, e.g. " +
      "mysql://root:password@127.0.0.1:3306/sshs_test (a local MySQL 8 database whose name ends in _test)."
  );
}

// MySQL 8's default caching_sha2_password auth plugin can require RSA
// public-key retrieval over a non-TLS local connection; the Prisma MariaDB
// adapter reads this as a URL query param and passes it through as a pool
// option, so we set it here rather than editing .env.local or lib/prisma.ts.
const testDatabaseUrl = new URL(rawTestDatabaseUrl);
if (!testDatabaseUrl.searchParams.has("allowPublicKeyRetrieval")) {
  testDatabaseUrl.searchParams.set("allowPublicKeyRetrieval", "true");
}
const TEST_DATABASE_URL = testDatabaseUrl.toString();

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/setup/global-setup.ts"],
    // One shared database: run test files one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      TEST_DATABASE_URL,
      NEXTAUTH_SECRET: "test-secret-for-vitest-0123456789abcdef",
    },
  },
});
