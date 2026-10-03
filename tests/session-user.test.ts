import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSession, findUnique } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ default: { user: { findUnique } } }));

import { getSessionUser } from "@/lib/session-user";

const session = (role: string, status: string, sessionVersion = 0) => ({ user: { id: "u1", email: "a@example.test", role, status, sessionVersion } });

describe("getSessionUser", () => {
  beforeEach(() => {
    getServerSession.mockReset();
    findUnique.mockReset();
    findUnique.mockResolvedValue({ role: "ALUMNI", status: "VERIFIED", sessionVersion: 0 });
  });

  it("treats pending and rejected members as signed out", async () => {
    getServerSession.mockResolvedValue(session("ALUMNI", "PENDING"));
    findUnique.mockResolvedValue({ role: "ALUMNI", status: "PENDING", sessionVersion: 0 });
    expect(await getSessionUser()).toBeNull();
    getServerSession.mockResolvedValue(session("ALUMNI", "REJECTED"));
    findUnique.mockResolvedValue({ role: "ALUMNI", status: "REJECTED", sessionVersion: 0 });
    expect(await getSessionUser()).toBeNull();
  });
  it("returns verified members and staff whatever their status", async () => {
    getServerSession.mockResolvedValue(session("ALUMNI", "VERIFIED"));
    expect(await getSessionUser()).toEqual({ id: "u1", email: "a@example.test", role: "ALUMNI" });
    getServerSession.mockResolvedValue(session("ADMIN", "PENDING"));
    findUnique.mockResolvedValue({ role: "ADMIN", status: "PENDING", sessionVersion: 0 });
    expect(await getSessionUser()).toMatchObject({ role: "ADMIN" });
  });
  it("returns null with no session", async () => {
    getServerSession.mockResolvedValue(null);
    expect(await getSessionUser()).toBeNull();
  });
  it("rejects a stale or revoked session even when its JWT claims remain privileged", async () => {
    getServerSession.mockResolvedValue(session("ADMIN", "VERIFIED", 1));
    findUnique.mockResolvedValue({ role: "ALUMNI", status: "REJECTED", sessionVersion: 2 });
    expect(await getSessionUser()).toBeNull();
  });
});
