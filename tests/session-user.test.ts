import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.fn();
vi.mock("next-auth", () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import { getSessionUser } from "@/lib/session-user";

const session = (role: string, status: string) => ({ user: { id: "u1", email: "a@example.test", role, status } });

describe("getSessionUser", () => {
  beforeEach(() => getServerSession.mockReset());

  it("treats pending and rejected members as signed out", async () => {
    getServerSession.mockResolvedValue(session("ALUMNI", "PENDING"));
    expect(await getSessionUser()).toBeNull();
    getServerSession.mockResolvedValue(session("ALUMNI", "REJECTED"));
    expect(await getSessionUser()).toBeNull();
  });
  it("returns verified members and staff whatever their status", async () => {
    getServerSession.mockResolvedValue(session("ALUMNI", "VERIFIED"));
    expect(await getSessionUser()).toEqual({ id: "u1", email: "a@example.test", role: "ALUMNI" });
    getServerSession.mockResolvedValue(session("ADMIN", "PENDING"));
    expect(await getSessionUser()).toMatchObject({ role: "ADMIN" });
  });
  it("returns null with no session", async () => {
    getServerSession.mockResolvedValue(null);
    expect(await getSessionUser()).toBeNull();
  });
});
