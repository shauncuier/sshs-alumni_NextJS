import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";
import { makeImage } from "./helpers/images";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { createStory, deleteStory, getPublishedStory, listPublishedStories, publishedStoryIds, readTime, updateStory } from "@/lib/stories";
import { createAchievement, listPublishedAchievements, updateAchievement } from "@/lib/achievements";
import { contentImagePath, processContentImage, saveContentImage } from "@/lib/media/content-images";
import { POST as createStoryRoute } from "@/app/api/admin/stories/route";
import { GET as listAchievementsRoute } from "@/app/api/admin/achievements/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});
afterAll(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

const story = {
  title: "From the back bench to the operating theatre",
  authorName: "Dr. Farhana Akter",
  batchYear: 2002,
  profession: "Cardiac Surgeon",
  fullStory: "I was never the top of my class at SSGHS.\n\nBut a teacher who believed in me changed everything, and twenty years later I lead a cardiac unit.",
};
const achievement = {
  recipientName: "Engr. Rafiq Hasan",
  batchYear: 1998,
  category: "Engineers",
  title: "National Infrastructure Award",
  organization: "Ministry of Planning",
  description: "For leading the design of the Karnaphuli tunnel approach roads.",
  yearAwarded: 2025,
};

describe("stories", () => {
  it("drafts stay hidden; published stories appear with a reading time", async () => {
    const draft = await createStory(story, "boss@example.test");
    expect(draft.isPublished).toBe(false);
    expect(draft.summary).toBe("I was never the top of my class at SSGHS.");
    expect(await listPublishedStories()).toEqual([]);
    expect(await getPublishedStory(draft.id)).toBeNull();
    expect(await publishedStoryIds()).toEqual([]);

    await updateStory(draft.id, { isPublished: true }, "boss@example.test");
    const [item] = await listPublishedStories();
    expect(item).toMatchObject({ id: draft.id, authorName: "Dr. Farhana Akter", readTime: "1 min read", coverImage: "/golden-jubilee.jpg" });
    expect((await getPublishedStory(draft.id))?.fullStory).toContain("cardiac unit");
    expect((await publishedStoryIds()).map((s) => s.id)).toEqual([draft.id]);
  });

  it("estimates reading time from the length", () => {
    expect(readTime("word ".repeat(1000))).toBe("5 min read");
    expect(readTime("short")).toBe("1 min read");
  });

  it("refuses bad input and outside image links, and cleans up the cover", async () => {
    await expect(createStory({ ...story, batchYear: 1800 }, "x")).rejects.toMatchObject({ status: 400 });
    await expect(createStory({ ...story, fullStory: "too short" }, "x")).rejects.toMatchObject({ status: 400 });
    await expect(createStory({ ...story, coverImage: "https://elsewhere.example/a.jpg" }, "x")).rejects.toMatchObject({ status: 400 });

    const cover = await saveContentImage(await processContentImage(await makeImage(800, 600)));
    const created = await createStory({ ...story, coverImage: cover.url }, "x");
    await deleteStory(created.id);
    await expect(fs.access(contentImagePath(cover.id, "large.webp")!)).rejects.toThrow();
  });
});

describe("achievements", () => {
  it("only published achievements are listed, newest award first", async () => {
    const older = await createAchievement({ ...achievement, yearAwarded: 2020, isPublished: true }, "x");
    const hidden = await createAchievement({ ...achievement, title: "Draft award" }, "x");
    const newer = await createAchievement({ ...achievement, title: "Gold Medal", yearAwarded: 2025, isPublished: true }, "x");
    const list = await listPublishedAchievements();
    expect(list.map((a) => a.id)).toEqual([newer.id, older.id]);
    expect(list[0].photoUrl).toContain("ui-avatars.com");
    await updateAchievement(hidden.id, { isPublished: true }, "x");
    expect(await listPublishedAchievements()).toHaveLength(3);
  });

  it("refuses unknown categories and impossible years", async () => {
    await expect(createAchievement({ ...achievement, category: "Influencers" }, "x")).rejects.toMatchObject({ status: 400 });
    await expect(createAchievement({ ...achievement, yearAwarded: 3000 }, "x")).rejects.toMatchObject({ status: 400 });
  });
});

describe("admin routes", () => {
  it("are admin-only and log changes", async () => {
    const json = (body: unknown) => new Request("http://x/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    expect((await createStoryRoute(json(story))).status).toBe(403);
    expect((await listAchievementsRoute()).status).toBe(403);

    const admin = await makeMember({ role: "ADMIN", email: "boss@example.test" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    expect((await createStoryRoute(json({ ...story, isPublished: true }))).status).toBe(201);
    expect((await (await listAchievementsRoute()).json()).categories).toContain("Doctors");
    expect(await prisma.activityLog.count({ where: { action: "story.published", actorEmail: "boss@example.test" } })).toBe(1);
  });
});
