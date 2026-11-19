import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BREAKER_MS, deserialize, lastGood, resetLastGood, serialize } from "@/lib/last-good";

const denied = () => new Error("(conn:41, no: 1142, SQLState: 42000) SELECT command denied to user 'u'@'127.0.0.1' for table `db`.`Notice`");

let dir: string;
let clock: number;
const now = () => clock;

beforeEach(async () => {
  resetLastGood();
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "last-good-"));
  clock = Date.parse("2026-11-19T10:00:00Z");
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(dir, { recursive: true, force: true });
});

describe("lastGood", () => {
  it("returns live data and saves a copy", async () => {
    const data = [{ id: "n1", title: "AGM", startsAt: new Date("2026-12-01T09:00:00Z") }];
    expect(await lastGood("notices", async () => data, [], { dir, now })).toEqual(data);
    const saved = JSON.parse(await fs.readFile(path.join(dir, "notices.json"), "utf8"));
    expect(deserialize(saved.json)).toEqual(data);
  });

  it("shows the last good copy, Dates intact, when the database is unavailable", async () => {
    const data = [{ id: "n1", startsAt: new Date("2026-12-01T09:00:00Z"), views: BigInt(7) }];
    await lastGood("notices", async () => data, [], { dir, now });
    clock += 5 * 60_000;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const shown = await lastGood<typeof data>("notices", async () => Promise.reject(denied()), [], { dir, now });
    expect(shown).toEqual(data);
    expect(shown[0].startsAt).toBeInstanceOf(Date);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("reads the disk copy in a process that never saw the data (another server process, or after a restart)", async () => {
    await lastGood("committee", async () => ({ president: "Rahim" }), null, { dir, now });
    resetLastGood();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await lastGood("committee", async () => Promise.reject(denied()), null, { dir, now })).toEqual({ president: "Rahim" });
  });

  it("does not show a copy older than maxAgeDays", async () => {
    await lastGood("news", async () => ["old"], [], { dir, now });
    clock += 15 * 24 * 60 * 60_000;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await lastGood("news", async () => Promise.reject(denied()), ["fallback"], { dir, now })).toEqual(["fallback"]);
  });

  it("gives the fallback when there is no copy", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await lastGood("gallery", async () => Promise.reject(denied()), [], { dir, now })).toEqual([]);
  });

  it("logs a bug as an error and gives the fallback, without touching the copy", async () => {
    await lastGood("events", async () => ["e1"], [], { dir, now });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await lastGood("events", async () => Promise.reject(new TypeError("boom")), [], { dir, now })).toEqual([]);
    expect(error).toHaveBeenCalled();
    resetLastGood();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await lastGood("events", async () => Promise.reject(denied()), [], { dir, now })).toEqual(["e1"]);
  });

  it("stops asking the database for a while after an outage error, then tries again", async () => {
    await lastGood("stories", async () => ["s1"], [], { dir, now });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await lastGood("stories", async () => Promise.reject(denied()), [], { dir, now });
    const loader = vi.fn(async () => ["s2"]);
    clock += BREAKER_MS - 1;
    expect(await lastGood("stories", loader, [], { dir, now })).toEqual(["s1"]);
    expect(loader).not.toHaveBeenCalled();
    clock += 2;
    expect(await lastGood("stories", loader, [], { dir, now })).toEqual(["s2"]);
    expect(loader).toHaveBeenCalledOnce();
  });

  it("keeps the saved copy current when the data changes (at most once a minute)", async () => {
    await lastGood("batches", async () => [1], [], { dir, now });
    clock += 30_000;
    await lastGood("batches", async () => [1, 2], [], { dir, now });
    const read = async () => deserialize(JSON.parse(await fs.readFile(path.join(dir, "batches.json"), "utf8")).json);
    expect(await read()).toEqual([1]);
    clock += 31_000;
    await lastGood("batches", async () => [1, 2], [], { dir, now });
    expect(await read()).toEqual([1, 2]);
  });

  it("never reads a half-written file left by a crashed write", async () => {
    await fs.writeFile(path.join(dir, "honor.json"), "{\"savedAt\": 1, \"json\": \"[1,");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await lastGood("honor", async () => Promise.reject(denied()), ["fallback"], { dir, now })).toEqual(["fallback"]);
  });
});

describe("serialize", () => {
  it("round-trips Dates and BigInts", () => {
    const v = { at: new Date("2026-01-02T03:04:05.006Z"), n: BigInt("12345678901234567890"), list: [new Date(0)] };
    expect(deserialize(serialize(v))).toEqual(v);
  });
});
