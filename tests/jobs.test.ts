import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

const mail = vi.hoisted(() => ({ sent: [] as { to: string; replyTo?: string; subject: string; text?: string }[] }));
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...actual,
    sendEmail: async (payload: { to: string; replyTo?: string; subject: string; text?: string }) => {
      mail.sent.push(payload);
      return { success: true, messageId: "m1" };
    },
  };
});

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { applyToJob, createJob, decideJob, getPublicJob, listJobsByPoster, listOpenJobs } from "@/lib/jobs";
import { POST as postJobRoute } from "@/app/api/jobs/route";
import { POST as applyRoute } from "@/app/api/jobs/[id]/apply/route";
import { PATCH as decideRoute } from "@/app/api/jobs/[id]/route";

beforeEach(async () => {
  mail.sent = [];
  session.user = null;
  await resetDatabase();
});

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const job = {
  title: "Junior Software Engineer",
  company: "Chattogram Tech Ltd",
  location: "Chattogram",
  workplaceType: "Hybrid",
  jobType: "Full-time",
  department: "Engineering",
  experienceLevel: "Entry Level",
  description: "Build and maintain web applications for logistics clients in Chattogram port.",
  requirements: ["TypeScript", "SQL"],
  deadline: inDays(30),
};
const applicant = { applicantName: "Nabil Rahman", applicantEmail: "Nabil@Example.test", applicantPhone: "01711000999", applicantBatch: 2018, resumeUrl: "https://drive.example/cv.pdf", coverNote: "Keen to join." };
const json = (body: unknown, method = "POST") => new Request("http://x/api", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const member = async (status: "VERIFIED" | "PENDING" = "VERIFIED", email = "poster@example.test") => {
  const m = await makeMember({ status, email });
  return { id: m.id, email: m.email, role: "ALUMNI" };
};
const admin = async () => {
  const a = await makeMember({ role: "ADMIN", email: "boss@example.test" });
  return { id: a.id, email: a.email, role: "ADMIN" };
};

describe("posting", () => {
  it("a verified member's job waits for review; an admin's goes live", async () => {
    const poster = await member();
    const pending = await createJob(poster, job);
    expect(pending.status).toBe("PENDING");
    expect(await listOpenJobs()).toEqual([]);
    expect(await getPublicJob(pending.id)).toBeNull();

    const boss = await admin();
    const live = await createJob(boss, { ...job, title: "Admin posted role" });
    expect(live).toMatchObject({ status: "APPROVED", reviewedBy: "boss@example.test" });
    expect((await listOpenJobs()).map((j) => j.id)).toEqual([live.id]);
  });

  it("refuses unverified members and bad input", async () => {
    await expect(createJob(await member("PENDING"), job)).rejects.toMatchObject({ status: 403 });
    const poster = await member("VERIFIED", "ok@example.test");
    await expect(createJob(poster, { ...job, description: "short" })).rejects.toMatchObject({ status: 400 });
    await expect(createJob(poster, { ...job, jobType: "Gig" })).rejects.toMatchObject({ status: 400 });
    await expect(createJob(poster, { ...job, deadline: inDays(-2) })).rejects.toMatchObject({ status: 400 });
    await expect(createJob(poster, { ...job, deadline: inDays(400) })).rejects.toMatchObject({ status: 400 });
  });
});

describe("review", () => {
  it("admins approve or reject with a reason; posters can only close their own", async () => {
    const poster = await member();
    const other = await member("VERIFIED", "other@example.test");
    const boss = await admin();
    const a = await createJob(poster, job);
    const b = await createJob(poster, { ...job, title: "Second role" });

    await expect(decideJob(poster, a.id, "APPROVE")).rejects.toMatchObject({ status: 403 });
    await expect(decideJob(boss, a.id, "REJECT", "")).rejects.toMatchObject({ status: 400 });
    expect((await decideJob(boss, a.id, "APPROVE")).status).toBe("APPROVED");
    await expect(decideJob(boss, a.id, "APPROVE")).rejects.toMatchObject({ status: 409 });
    expect((await decideJob(boss, b.id, "REJECT", "Looks like a scam")).rejectReason).toBe("Looks like a scam");

    await expect(decideJob(other, a.id, "CLOSE")).rejects.toMatchObject({ status: 403 });
    expect((await decideJob(poster, a.id, "CLOSE")).status).toBe("CLOSED");
    expect(await listOpenJobs()).toEqual([]);
    expect((await getPublicJob(a.id))?.open).toBe(false);
  });
});

describe("applying", () => {
  it("stores the application, emails the poster and shows it in My jobs", async () => {
    const poster = await member();
    const live = await createJob(await admin(), job);
    await prisma.job.update({ where: { id: live.id }, data: { postedById: poster.id, postedByEmail: poster.email } });

    const { application } = await applyToJob(live.id, applicant, null);
    expect(application.email).toBe("nabil@example.test");
    await expect(applyToJob(live.id, applicant, null)).rejects.toMatchObject({ status: 409, code: "ALREADY_APPLIED" });

    const mine = await listJobsByPoster(poster.id);
    expect(mine[0].applications.map((x) => x.name)).toEqual(["Nabil Rahman"]);
    expect((await listOpenJobs())[0].applicationCount).toBe(1);
  });

  it("refuses pending, closed and expired jobs, and non-https CV links", async () => {
    const poster = await member();
    const pending = await createJob(poster, job);
    await expect(applyToJob(pending.id, applicant, null)).rejects.toMatchObject({ status: 404 });

    const live = await createJob(await admin(), job);
    await expect(applyToJob(live.id, { ...applicant, resumeUrl: "javascript:alert(1)" }, null)).rejects.toMatchObject({ status: 400 });
    await prisma.job.update({ where: { id: live.id }, data: { deadline: new Date(Date.now() - 60_000) } });
    await expect(applyToJob(live.id, applicant, null)).rejects.toMatchObject({ status: 409, code: "JOB_CLOSED" });
  });
});

describe("routes", () => {
  it("posting needs sign-in; applying emails the poster; decisions are logged", async () => {
    expect((await postJobRoute(json(job))).status).toBe(401);

    const poster = await member();
    session.user = poster;
    const posted = await (await postJobRoute(json(job))).json();
    expect(posted.status).toBe("PENDING");

    const boss = await admin();
    session.user = boss;
    const ctx = { params: Promise.resolve({ id: posted.jobId }) };
    expect((await decideRoute(json({ action: "APPROVE" }, "PATCH"), ctx)).status).toBe(200);

    session.user = null;
    expect((await applyRoute(json(applicant), ctx)).status).toBe(200);
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]).toMatchObject({ to: "poster@example.test", replyTo: "nabil@example.test" });

    const actions = (await prisma.activityLog.findMany()).map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(["job.submitted", "job.approved", "job.applied"]));
  });
});
