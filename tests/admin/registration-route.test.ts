import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ session: null as { user: { email: string; role: string } } | null }));
vi.mock("@/lib/session-user", () => ({
  getSessionUser: async () => auth.session?.user ?? null,
  isAdminRole: (role: string) => role === "ADMIN" || role === "SUPER_ADMIN",
}));

import { PATCH } from "@/app/api/admin/events/[id]/registrations/[regId]/route";

const params = Promise.resolve({ id: "event-id", regId: "registration-id" });

function patch(body: string) {
  return PATCH(
    new Request("http://localhost/api/admin/events/event-id/registrations/registration-id", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body,
    }),
    { params }
  );
}

beforeEach(() => {
  auth.session = { user: { email: "admin@example.test", role: "ADMIN" } };
});

describe("PATCH /api/admin/events/[id]/registrations/[regId]", () => {
  it("rejects a malformed body with 400", async () => {
    const res = await patch("{bad");
    expect(res.status).toBe(400);
  });

  it("rejects an unknown action with 400", async () => {
    const res = await patch(JSON.stringify({ action: "NOPE" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Unknown action." });
  });

  it("rejects a body that is not an object with 400", async () => {
    const res = await patch("null");
    expect(res.status).toBe(400);
  });

  it("refuses non-admins", async () => {
    auth.session = { user: { email: "member@example.test", role: "ALUMNI" } };
    const res = await patch(JSON.stringify({ action: "APPROVE" }));
    expect(res.status).toBe(403);
  });
});
