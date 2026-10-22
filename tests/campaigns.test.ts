import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { CATEGORY_LABELS, campaignStatus, createCampaign, deleteCampaign, listAdminCampaigns, listOpenCampaigns, updateCampaign } from "@/lib/campaigns";
import { createManualDonation } from "@/lib/donations";
import { GET as listRoute, POST as createRoute } from "@/app/api/admin/campaigns/route";
import { DELETE as deleteRoute, PATCH as patchRoute } from "@/app/api/admin/campaigns/[id]/route";
import { GET as publicRoute } from "@/app/api/donations/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000 + 6 * 3_600_000).toISOString().slice(0, 10);
const fund = { title: "Needy Student Scholarship", category: "SCHOLARSHIP", description: "Tuition and books for students who need help.", goalAmount: 500000 };
const json = (body: unknown, method = "POST") => new Request("http://x/api", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const donate = (campaignId: string, transactionId = "TRX12345") =>
  createManualDonation({ campaignId, amount: 1000, donorName: "Donor", donorPhone: "01711000000", paymentMethod: "bKash", transactionId }, null);

describe("campaigns", () => {
  it("creates a campaign that is open for donations and listed publicly", async () => {
    const c = await createCampaign({ ...fund, endDate: day(30) });
    expect(c).toMatchObject({ status: "OPEN", isActive: true, categoryLabel: "Scholarship", raisedAmount: 0, donationsCount: 0 });
    expect(c.daysLeft).toBeGreaterThanOrEqual(30);
    expect((await listOpenCampaigns()).map((x) => x.title)).toEqual([fund.title]);
    await expect(donate(c.id)).resolves.toBeTruthy();
  });

  it("accepts reunion, sports and cultural programme campaigns", async () => {
    for (const category of ["REUNION", "SPORTS", "CULTURAL"]) {
      const c = await createCampaign({ ...fund, title: `Fund ${category}`, category });
      expect(c.category).toBe(category);
    }
    expect(CATEGORY_LABELS.CULTURAL).toBe("Cultural Program");
  });

  it("validates title, category, goal, dates and banner image", async () => {
    await expect(createCampaign({ ...fund, title: "x" })).rejects.toMatchObject({ status: 400 });
    await expect(createCampaign({ ...fund, category: "WIZARDRY" })).rejects.toMatchObject({ status: 400 });
    await expect(createCampaign({ ...fund, goalAmount: 0 })).rejects.toMatchObject({ status: 400 });
    await expect(createCampaign({ ...fund, startDate: day(5), endDate: day(1) })).rejects.toMatchObject({ status: 400 });
    await expect(createCampaign({ ...fund, endDate: "31/12/2027" })).rejects.toMatchObject({ status: 400 });
    await expect(createCampaign({ ...fund, bannerImage: "https://evil.example/x.png" })).rejects.toMatchObject({ status: 400 });
  });

  it("closed, ended and future campaigns are hidden and take no donations", async () => {
    const closed = await createCampaign(fund);
    await updateCampaign(closed.id, { isActive: false });
    const upcoming = await createCampaign({ ...fund, title: "Starts later", startDate: day(10) });
    const ended = await createCampaign({ ...fund, title: "Ended fund" });
    await prisma.donationCampaign.update({ where: { id: ended.id }, data: { startDate: new Date(Date.now() - 10 * 86_400_000), endDate: new Date(Date.now() - 86_400_000) } });

    const statuses = Object.fromEntries((await listAdminCampaigns()).map((c) => [c.title, c.status]));
    expect(statuses).toEqual({ [fund.title]: "CLOSED", "Starts later": "UPCOMING", "Ended fund": "ENDED" });
    expect(await listOpenCampaigns()).toEqual([]);
    for (const c of [closed, upcoming, ended]) await expect(donate(c.id)).rejects.toMatchObject({ status: 404 });

    await updateCampaign(closed.id, { isActive: true });
    expect(campaignStatus(await prisma.donationCampaign.findUniqueOrThrow({ where: { id: closed.id } }))).toBe("OPEN");
  });

  it("edits keep the money raised; an empty end date removes it", async () => {
    const c = await createCampaign({ ...fund, endDate: day(30) });
    await prisma.donationCampaign.update({ where: { id: c.id }, data: { raisedAmount: 2500, donorCount: 2 } });
    const { after } = await updateCampaign(c.id, { title: "Scholarship 2027", goalAmount: 750000, endDate: "" });
    expect(after).toMatchObject({ title: "Scholarship 2027", goalAmount: 750000, raisedAmount: 2500, donorCount: 2, endDate: null, daysLeft: null });
  });

  it("a campaign with donations cannot be deleted, only closed", async () => {
    const used = await createCampaign(fund);
    await donate(used.id);
    await expect(deleteCampaign(used.id)).rejects.toMatchObject({ status: 409 });
    const unused = await createCampaign({ ...fund, title: "Never used" });
    await deleteCampaign(unused.id);
    expect(await prisma.donationCampaign.count()).toBe(1);
  });
});

describe("campaign routes", () => {
  it("only admins manage campaigns, and every change is logged", async () => {
    expect((await createRoute(json(fund))).status).toBe(403);
    for (const role of ["ALUMNI", "MODERATOR"] as const) {
      const m = await makeMember({ role });
      session.user = { id: m.id, email: m.email, role };
      expect((await createRoute(json(fund))).status).toBe(403);
      expect((await listRoute()).status).toBe(403);
    }

    const admin = await makeMember({ role: "ADMIN" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    const created = await createRoute(json(fund));
    expect(created.status).toBe(201);
    const { campaign } = await created.json();
    expect((await (await listRoute()).json()).campaigns).toHaveLength(1);
    expect((await (await publicRoute()).json()).campaigns).toHaveLength(1);

    expect((await patchRoute(json({ isActive: false }, "PATCH"), params(campaign.id))).status).toBe(200);
    expect((await (await publicRoute()).json()).campaigns).toEqual([]);
    expect((await deleteRoute(json({}, "DELETE"), params(campaign.id))).status).toBe(200);

    const actions = (await prisma.activityLog.findMany({ where: { action: { startsWith: "campaign." } }, orderBy: { createdAt: "asc" } })).map((l) => l.action);
    expect(actions).toEqual(["campaign.created", "campaign.closed", "campaign.deleted"]);
  });
});
