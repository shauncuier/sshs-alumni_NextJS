import { execSync } from "node:child_process";
import mariadb from "mariadb";

// Recreates the test database from prisma/schema.prisma before every test run.
// Refuses to touch anything that is not a local test database.
export default async function globalSetup() {
  const rawUrl = process.env.TEST_DATABASE_URL;
  if (!rawUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Add it to .env.local, e.g. " +
        "mysql://root:password@127.0.0.1:3306/sshs_test (a local MySQL 8 database whose name ends in _test)."
    );
  }

  const url = new URL(rawUrl);
  const database = url.pathname.replace(/^\//, "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || !database.endsWith("_test")) {
    throw new Error(`Refusing to reset ${url.hostname}/${database}: tests only run against a local *_test database.`);
  }

  // Pass DATABASE_URL explicitly so `prisma migrate diff` (invoked below)
  // resolves it via prisma.config.ts's env("DATABASE_URL") to this test URL,
  // never to the production URL in .env. migrate diff --from-empty is
  // read-only and does not connect to any database, so the value only needs
  // to be a well-formed mysql:// URL.
  const sql = execSync("npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script", {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: rawUrl },
  });

  const conn = await mariadb.createConnection({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    // MySQL 8's default caching_sha2_password auth plugin can require this
    // over a non-TLS local connection.
    allowPublicKeyRetrieval: true,
    multipleStatements: true,
  });
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await conn.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${database}\``);
    await conn.query(sql);
  } finally {
    await conn.end();
  }
}
