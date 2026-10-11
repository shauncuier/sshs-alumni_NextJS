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

import { createRequest, listApprovedMentors, listMyMentorship, respondToRequest, saveMentorProfile, setMentorStatus } from "@/lib/mentorship";
import { PUT as profileRoute } from "@/app/api/mentorship/profile/route";
import { POST as requestRoute } from "@/app/api/mentorship/requests/route";
import { PATCH as adminMentorRoute } from "@/app/api/admin/mentors/[id]/route";

beforeEach(async () => {
  mail.sent = [];
  session.user = null;
  await resetDatabase();
});

const profile = {
  designation: "Senior Software Engineer",
  organization: "Global Tech",
  domain: "Software & AI",
  bio: "Fifteen years building software; happy to help younger alumni start in tech.",
  yearsOfExperience: 15,
  topicsOffered: ["CV review", "Interview practice"],
  skills: "TypeScript\nSystem design",
  availableDays: ["Friday evening"],
};
const member = async (email: string, status: "VERIFIED" | "PENDING" = "VERIFIED") => {
  const m = await makeMember({ email, status });
  return { id: m.id, email: m.email, role: "ALUMNI" };
};
const admin = async () => {
  const a = await makeMember({ role: "ADMIN", email: "boss@example.test" });
  return { id: a.id, email: a.email, role: "ADMIN" };
};
const approvedMentor = async () => {
  const actor = await member("mentor@example.test");
  const { mentor } = await saveMentorProfile(actor, profile);
  await setMentorStatus(await admin(), mentor.id, "APPROVE");
  return { actor, mentor };
};

describe("mentor profiles", () => {
  it("new profiles wait for approval; approved ones are listed without a fake rating", async () => {
    const actor = await member("mentor@example.test");
    const { mentor, created } = await saveMentorProfile(actor, profile);
    expect(created).toBe(true);
    expect(mentor.status).toBe("PENDING");
    expect(await listApprovedMentors()).toEqual([]);

    await setMentorStatus(await admin(), mentor.id, "APPROVE");
    const [listed] = await listApprovedMentors();
    expect(listed).toMatchObject({ id: mentor.id, rating: 0, totalMenteesHelped: 0, skills: ["TypeScript", "System design"] });

    await setMentorStatus(actor, mentor.id, "PAUSE");
    expect(await listApprovedMentors()).toEqual([]);
    await setMentorStatus(actor, mentor.id, "RESUME");
    expect(await listApprovedMentors()).toHaveLength(1);
  });

  it("refuses unverified members, bad input and non-admin reviews", async () => {
    await expect(saveMentorProfile(await member("new@example.test", "PENDING"), profile)).rejects.toMatchObject({ status: 403 });
    const actor = await member("m2@example.test");
    await expect(saveMentorProfile(actor, { ...profile, domain: "Astrology" })).rejects.toMatchObject({ status: 400 });
    await expect(saveMentorProfile(actor, { ...profile, topicsOffered: [] })).rejects.toMatchObject({ status: 400 });
    const { mentor } = await saveMentorProfile(actor, profile);
    await expect(setMentorStatus(actor, mentor.id, "APPROVE")).rejects.toMatchObject({ status: 403 });
    await expect(setMentorStatus(await admin(), mentor.id, "REJECT", "")).rejects.toMatchObject({ status: 400 });
  });

  it("a rejected profile goes back to review when edited", async () => {
    const actor = await member("m3@example.test");
    const { mentor } = await saveMentorProfile(actor, profile);
    await setMentorStatus(await admin(), mentor.id, "REJECT", "Please add more detail");
    const { mentor: again } = await saveMentorProfile(actor, { ...profile, bio: `${profile.bio} More detail about my background.` });
    expect(again).toMatchObject({ status: "PENDING", rejectReason: null });
  });
});

describe("requests", () => {
  it("are emailed to the mentor, accepted with meeting details, and the mentee is told", async () => {
    const { actor: mentorActor, mentor } = await approvedMentor();
    const mentee = await member("mentee@example.test");

    const { request } = await createRequest(mentee, { mentorId: mentor.id, topic: "CV review", message: "Final year CSE." });
    expect(mail.sent[0]).toMatchObject({ to: "mentor@example.test", replyTo: "mentee@example.test" });
    await expect(createRequest(mentee, { mentorId: mentor.id, topic: "CV review" })).rejects.toMatchObject({ status: 409 });

    await expect(respondToRequest(mentee, request.id, "ACCEPT", { meetingDetails: "Meet link" })).rejects.toMatchObject({ status: 403 });
    await expect(respondToRequest(mentorActor, request.id, "ACCEPT", { meetingDetails: "" })).rejects.toMatchObject({ status: 400 });
    const accepted = await respondToRequest(mentorActor, request.id, "ACCEPT", { meetingDetails: "Google Meet, Friday 8 pm", reply: "Happy to help" });
    expect(accepted.status).toBe("ACCEPTED");
    expect(mail.sent[1]).toMatchObject({ to: "mentee@example.test", replyTo: "mentor@example.test" });
    expect(mail.sent[1].text).toContain("Google Meet, Friday 8 pm");

    expect((await listApprovedMentors())[0].totalMenteesHelped).toBe(1);
    const mine = await listMyMentorship(mentee.id);
    expect(mine.sent[0]).toMatchObject({ status: "ACCEPTED", meetingDetails: "Google Meet, Friday 8 pm" });
  });

  it("cannot be sent to yourself, to unlisted mentors, or by unverified members; mentees can cancel", async () => {
    const { actor: mentorActor, mentor } = await approvedMentor();
    await expect(createRequest(mentorActor, { mentorId: mentor.id, topic: "x" })).rejects.toMatchObject({ status: 400 });
    await expect(createRequest(await member("p@example.test", "PENDING"), { mentorId: mentor.id, topic: "x" })).rejects.toMatchObject({ status: 403 });

    const mentee = await member("mentee@example.test");
    const { request } = await createRequest(mentee, { mentorId: mentor.id, topic: "CV review" });
    expect((await respondToRequest(mentee, request.id, "CANCEL", {})).status).toBe("CANCELLED");
    await expect(respondToRequest(mentorActor, request.id, "ACCEPT", { meetingDetails: "Meet link here" })).rejects.toMatchObject({ status: 409 });

    await setMentorStatus(mentorActor, mentor.id, "PAUSE");
    await expect(createRequest(mentee, { mentorId: mentor.id, topic: "CV review" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("routes", () => {
  it("need sign-in, admin review is admin-only, and everything is logged", async () => {
    const json = (body: unknown, method = "POST") => new Request("http://x/api", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    expect((await profileRoute(json(profile, "PUT"))).status).toBe(401);
    expect((await requestRoute(json({ mentorId: "x", topic: "y" }))).status).toBe(401);

    const actor = await member("mentor@example.test");
    session.user = actor;
    expect((await profileRoute(json(profile, "PUT"))).status).toBe(201);
    const mentor = await prisma.mentor.findFirstOrThrow();
    expect((await adminMentorRoute(json({ action: "APPROVE" }, "PATCH"), { params: Promise.resolve({ id: mentor.id }) })).status).toBe(403);

    session.user = await admin();
    expect((await adminMentorRoute(json({ action: "APPROVE" }, "PATCH"), { params: Promise.resolve({ id: mentor.id }) })).status).toBe(200);

    const actions = (await prisma.activityLog.findMany()).map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(["mentor.applied", "mentor.approved"]));
  });
});
