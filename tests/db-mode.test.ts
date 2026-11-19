import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { currentMode, noteDbFailure, probePrimary, registerPrimaryCheck, resetDbMode, setMode } from "@/lib/db-mode";

const modeFile = () => path.join(process.env.UPLOADS_DIR!, ".db-mode.json");

beforeEach(() => {
  resetDbMode();
  fs.rmSync(modeFile(), { force: true });
  process.env.STANDBY_DATABASE_URL = "mysql://u:p@standby.example:4000/sshs_standby";
});

afterEach(() => {
  resetDbMode();
  fs.rmSync(modeFile(), { force: true });
  process.env.STANDBY_DATABASE_URL = "";
  vi.restoreAllMocks();
});

describe("db mode", () => {
  it("never leaves the main database without a standby", () => {
    process.env.STANDBY_DATABASE_URL = "";
    const t = Date.now();
    expect(noteDbFailure(t)).toBe(false);
    expect(noteDbFailure(t + 1)).toBe(false);
    expect(currentMode(t + 2)).toBe("primary");
  });

  it("switches to the standby after two failures within a minute, not one", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t = Date.now();
    expect(noteDbFailure(t)).toBe(false);
    expect(currentMode(t)).toBe("primary");
    expect(noteDbFailure(t + 1_000)).toBe(true);
    expect(currentMode(t + 1_000)).toBe("standby");
  });

  it("does not switch for two failures far apart", () => {
    const t = Date.now();
    noteDbFailure(t);
    expect(noteDbFailure(t + 61_000)).toBe(false);
    expect(currentMode(t + 61_000)).toBe("primary");
  });

  it("goes back after two good checks of the main database in a row", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    let up = false;
    registerPrimaryCheck(async () => {
      if (!up) throw new Error("connect ECONNREFUSED");
    });
    setMode("standby");
    expect(await probePrimary()).toBe("standby");
    up = true;
    expect(await probePrimary()).toBe("standby");
    up = false;
    expect(await probePrimary()).toBe("standby"); // a failure resets the count
    up = true;
    await probePrimary();
    expect(await probePrimary()).toBe("primary");
  });

  it("shares the switch with other server processes through the mode file", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t = Date.now();
    setMode("standby", new Date(t));
    expect(JSON.parse(fs.readFileSync(modeFile(), "utf8")).mode).toBe("standby");
    // Another process: fresh memory, same file.
    resetDbMode();
    expect(currentMode(t + 10_000)).toBe("standby");
  });
});
