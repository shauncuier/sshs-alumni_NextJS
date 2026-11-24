import { describe, expect, it } from "vitest";
import { dbErrorDetail, dbReason, isDbUnavailable, isHardDbOutage } from "@/lib/db-errors";
import { AppError } from "@/lib/app-error";

// Messages as the live site logged them (2026-11-18/19) and as the MariaDB driver words them.
const denied = new Error("(conn:41, no: 1142, SQLState: 42000) SELECT command denied to user 'u996175628_ssghs'@'127.0.0.1' for table `u996175628_ssghs`.`User`");

describe("isDbUnavailable", () => {
  it("knows lost permissions (MySQL 1142)", () => {
    expect(isDbUnavailable(denied)).toBe(true);
    expect(dbReason(denied)).toBe("permission");
  });

  it("looks into wrapped driver errors", () => {
    const wrapped = Object.assign(new Error("Invalid `prisma.user.findFirst()` invocation"), {
      name: "DriverAdapterError",
      cause: { code: "ER_TABLEACCESS_DENIED_ERROR", message: "INSERT command denied to user 'x'@'localhost' for table 'Message'" },
    });
    expect(isDbUnavailable(wrapped)).toBe(true);
    expect(dbReason(wrapped)).toBe("permission");
  });

  it("knows Prisma 7's wrapped pool error (P2039 with the driver error in meta)", () => {
    const e = Object.assign(new Error("Invalid `c.setting.findFirst()` invocation:\n\nDatabase error. Code: `45028`. Message: `pool failed to retrieve a connection from pool`"), {
      name: "PrismaClientKnownRequestError",
      code: "P2039",
      meta: { modelName: "Setting", driverAdapterError: { name: "DriverAdapterError", cause: { code: 45028, message: "pool failed to retrieve a connection from pool", cause: "connect ECONNREFUSED 127.0.0.1:1" } } },
    });
    expect(isDbUnavailable(e)).toBe(true);
    expect(dbReason(e)).toBe("down");
    const lost = Object.assign(new Error("Database error. Code: `1142`. Message: `SELECT command denied to user 'u'@'127.0.0.1' for table `db`.`User``"), { code: "P2039" });
    expect(dbReason(lost)).toBe("permission");
  });

  it("knows a server that cannot be reached", () => {
    for (const msg of [
      "connect ECONNREFUSED 127.0.0.1:3306",
      "pool timeout: failed to retrieve a connection from pool after 10001ms",
      "(conn:-1, no: 45028, SQLState: HY000) retrieve connection from pool timeout after 10001ms",
      "Can't reach database server at `127.0.0.1:3306`",
      "(conn:1, no: 1045, SQLState: 28000) Access denied for user 'x'@'localhost' (using password: YES)",
      "Database not ready: DATABASE_URL is not set.",
    ]) {
      expect(isDbUnavailable(new Error(msg)), msg).toBe(true);
      expect(dbReason(new Error(msg)), msg).toBe("down");
    }
    expect(isDbUnavailable(Object.assign(new Error("x"), { code: "P1001" }))).toBe(true);
  });

  it("tells a server that refused us apart from a busy pool", () => {
    // As the live site logged it on 2026-11-24 10:50 UTC.
    const socket = Object.assign(new Error("Invalid `prisma.user.findFirst()` invocation:\n\nDatabase error. Code: `45028`."), {
      code: "P2039",
      meta: {
        driverAdapterError: {
          cause: {
            code: 45028,
            message: "pool failed to retrieve a connection from pool (pool connections: active=0 idle=0 limit=5)",
            cause: "(conn:55217756, no: 45012, SQLState: 08S01) Connection timeout: failed to create socket after 5000ms",
          },
        },
      },
    });
    expect(isDbUnavailable(socket)).toBe(true);
    expect(isHardDbOutage(socket)).toBe(true);
    expect(isHardDbOutage(denied)).toBe(true);
    expect(isHardDbOutage(new Error("connect ECONNREFUSED 127.0.0.1:3306"))).toBe(true);
    expect(isHardDbOutage(Object.assign(new Error("x"), { code: "P1001" }))).toBe(true);
    // Every connection busy: the server works, the site is just loaded.
    const busy = new Error("pool timeout: failed to retrieve a connection from pool after 10001ms (pool connections: active=5 idle=0 limit=5)");
    expect(isDbUnavailable(busy)).toBe(true);
    expect(isHardDbOutage(busy)).toBe(false);
    expect(isHardDbOutage(new TypeError("Cannot read properties of undefined"))).toBe(false);
  });

  it("leaves bugs and bad input alone", () => {
    expect(isDbUnavailable(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(false);
    expect(isDbUnavailable(Object.assign(new Error("Unique constraint failed on the fields: (`email`)"), { code: "P2002" }))).toBe(false);
    expect(isDbUnavailable(new AppError("READ_ONLY", 503, "Saving is paused"))).toBe(false);
    expect(isDbUnavailable(new AppError("NOT_FOUND", 404, "Event not found"))).toBe(false);
    expect(isDbUnavailable(null)).toBe(false);
  });

  it("describes a wrapped error by the database's own message, not Prisma's source excerpt", () => {
    const e = Object.assign(new Error("Invalid `__TURBOPACK__imported__module__prisma.user.findFirst()` invocation in chunk.js:756\n\n→ 756 await prisma.user.findFirst("), {
      code: "P2039",
      meta: { driverAdapterError: { cause: { code: 45028, message: "pool failed to retrieve a connection from pool", cause: "connect ECONNREFUSED 127.0.0.1:3306" } } },
    });
    expect(dbErrorDetail(e)).toBe("45028 pool failed to retrieve a connection from pool connect ECONNREFUSED 127.0.0.1:3306");
    expect(dbErrorDetail(denied)).toMatch(/^\(conn:41, no: 1142/);
  });

  it("counts the site's own outage error", () => {
    expect(isDbUnavailable(new AppError("DB_UNAVAILABLE", 503, "briefly unavailable"))).toBe(true);
  });
});
