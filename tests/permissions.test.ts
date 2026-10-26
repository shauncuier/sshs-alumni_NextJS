import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";
import { ADMIN_AREAS, areaForPath, can, canUseAdminPanel, homeForRole } from "@/lib/permissions";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { POST as createNews } from "@/app/api/admin/news/route";
import { GET as listGallery } from "@/app/api/admin/gallery/route";
import { GET as listStories } from "@/app/api/admin/stories/route";
import { GET as listJobs } from "@/app/api/admin/jobs/route";
import { GET as listMentors } from "@/app/api/admin/mentors/route";
import { GET as listUsers } from "@/app/api/admin/users/route";
import { GET as listLogs } from "@/app/api/admin/logs/route";
import { GET as listDonations } from "@/app/api/admin/donations/route";
import { POST as sendSms } from "@/app/api/admin/sms/send/route";
import { decideJob, createJob } from "@/lib/jobs";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

describe("permission map", () => {
  it("admins use everything; moderators only content and the gate; members nothing", () => {
    for (const area of ADMIN_AREAS) {
      expect(can("ADMIN", area)).toBe(true);
      expect(can("SUPER_ADMIN", area)).toBe(true);
      expect(can("ALUMNI", area)).toBe(false);
    }
    const moderatorAreas = ADMIN_AREAS.filter((a) => can("MODERATOR", a));
    expect(moderatorAreas.sort()).toEqual(["feed", "gallery", "gate", "jobs", "mentors", "news", "notices", "stories"]);
    expect(canUseAdminPanel("MODERATOR")).toBe(true);
    // The treasurer keeps the accounts and nothing else.
    expect(ADMIN_AREAS.filter((a) => can("TREASURER", a))).toEqual(["accounts"]);
    expect(can("MODERATOR", "accounts")).toBe(false);
    expect(canUseAdminPanel("TREASURER")).toBe(true);
    expect(canUseAdminPanel("ALUMNI")).toBe(false);
    expect(canUseAdminPanel(undefined)).toBe(false);
  });

  it("maps admin paths to areas and sends each role to its first page", () => {
    expect(areaForPath("/admin")).toBe("dashboard");
    expect(areaForPath("/admin/news")).toBe("news");
    expect(areaForPath("/admin/users/abc")).toBe("users");
    expect(areaForPath("/admin/achievements")).toBe("stories");
    expect(areaForPath("/admin/honor-board")).toBe("committee");
    expect(areaForPath("/admin/constitution")).toBe("committee");
    expect(areaForPath("/admin/notices")).toBe("notices");
    expect(areaForPath("/admin/unknown-thing")).toBeNull();
    expect(homeForRole("ADMIN")).toBe("/admin");
    expect(homeForRole("MODERATOR")).toBe("/admin/news");
    expect(areaForPath("/admin/accounts/reports")).toBe("accounts");
    expect(areaForPath("/admin/settings")).toBe("settings");
    expect(can("MODERATOR", "settings")).toBe(false);
    expect(can("TREASURER", "settings")).toBe(false);
    expect(homeForRole("TREASURER")).toBe("/admin/accounts");
  });
});

describe("admin APIs follow the map", () => {
  const json = (body: unknown) => new Request("http://x/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  it("a moderator manages content but is refused members, money, SMS and logs", async () => {
    const mod = await makeMember({ role: "MODERATOR", email: "mod@example.test" });
    session.user = { id: mod.id, email: mod.email, role: "MODERATOR" };

    const created = await createNews(json({ title: "Moderator news", category: "Alumni News", content: "A real update written by a moderator for everyone." }));
    expect(created.status).toBe(201);
    for (const res of [await listGallery(), await listStories(), await listJobs(new Request("http://x/api")), await listMentors(new Request("http://x/api"))]) {
      expect(res.status).toBe(200);
    }

    expect((await listUsers(new Request("http://x/api"))).status).toBe(403);
    expect((await listLogs(new Request("http://x/api"))).status).toBe(403);
    expect((await listDonations()).status).toBe(403);
    expect((await sendSms(json({ recipients: ["01711000001"], message: "hi" }))).status).toBe(403);
  });

  it("a moderator can approve jobs; an ordinary member cannot reach any of it", async () => {
    const poster = await makeMember({ email: "poster@example.test" });
    const job = await createJob(
      { id: poster.id, email: poster.email, role: "ALUMNI" },
      {
        title: "Junior Engineer",
        company: "Port Tech",
        workplaceType: "On-site",
        jobType: "Full-time",
        experienceLevel: "Entry Level",
        description: "Maintain the port logistics systems with the engineering team.",
        deadline: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10),
      }
    );
    const mod = await makeMember({ role: "MODERATOR", email: "mod@example.test" });
    expect((await decideJob({ id: mod.id, email: mod.email, role: "MODERATOR" }, job.id, "APPROVE")).status).toBe("APPROVED");

    const member = await makeMember({ email: "m@example.test" });
    session.user = { id: member.id, email: member.email, role: "ALUMNI" };
    expect((await listGallery()).status).toBe(403);
    expect((await createNews(json({ title: "x" }))).status).toBe(403);
    expect(await prisma.newsArticle.count()).toBe(0);
  });

  it("donations stay admin-only", async () => {
    const admin = await makeMember({ role: "ADMIN", email: "boss@example.test" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    expect((await listDonations()).status).toBe(200);
  });
});
