import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { makeMember, resetDatabase } from "./helpers/db";
import { makeImage, makePdf } from "./helpers/images";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import prisma from "@/lib/prisma";
import { createMember, createTerm, deleteTerm, findPresident, getCurrentCommittee, getPresidentMessage, listPastTerms, setPresidentMessage, updateTerm } from "@/lib/committee";
import { createHonorEntry, groupHonorEntries, listHonorEntries } from "@/lib/honor-board";
import { createNotice, getActiveNotice, listActiveNotices, updateNotice } from "@/lib/notices";
import { createConstitution, listConstitutions } from "@/lib/constitution";
import { processContentImage, saveContentImage } from "@/lib/media/content-images";
import { checkDocument, saveDocument } from "@/lib/media/documents";
import { POST as createTermRoute } from "@/app/api/admin/committee/route";
import { POST as createNoticeRoute } from "@/app/api/admin/notices/route";
import { POST as uploadDocument } from "@/app/api/admin/documents/route";
import { GET as serveDocument } from "@/app/api/media/documents/[id]/[file]/route";
import { DEMO_PRESIDENT_MESSAGE, seedAssociationDemo } from "@/prisma/demo-association";
import { removeDemoContent } from "@/prisma/seed-core";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});
afterAll(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

const json = (body: unknown) => new Request("http://x/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const signIn = async (role: "ADMIN" | "MODERATOR" | "ALUMNI") => {
  const user = await makeMember({ role, email: `${role.toLowerCase()}@example.test` });
  session.user = { id: user.id, email: user.email, role };
};
const contentDirs = async () => fs.readdir(path.join(process.env.UPLOADS_DIR!, "content")).catch(() => [] as string[]);

describe("committee", () => {
  it("keeps one current term and lists the others as past, newest first", async () => {
    const a = await createTerm({ title: "Executive Committee 2019–2021", startYear: 2019, endYear: 2021, isCurrent: true });
    const b = await createTerm({ title: "Executive Committee 2022–2024", startYear: 2022, endYear: 2024 });
    const c = await createTerm({ title: "Executive Committee 2025–2027", startYear: 2025, endYear: 2027, isCurrent: true });
    expect((await getCurrentCommittee())?.id).toBe(c.id);
    expect((await listPastTerms()).map((t) => t.id)).toEqual([b.id, a.id]);
    await updateTerm(b.id, { isCurrent: true });
    expect((await getCurrentCommittee())?.id).toBe(b.id);
    expect(await prisma.committeeTerm.count({ where: { isCurrent: true } })).toBe(1);
  });

  it("checks the fields and refuses linked images", async () => {
    await expect(createTerm({ title: "X", startYear: 2020 })).rejects.toMatchObject({ status: 400 });
    await expect(createTerm({ title: "Committee", startYear: 2024, endYear: 2020 })).rejects.toMatchObject({ status: 400 });
    await expect(createTerm({ title: "Committee", startYear: 2024, imageUrl: "https://evil.example/x.png" })).rejects.toMatchObject({ status: 400 });
    const term = await createTerm({ title: "Committee", startYear: 2024, isCurrent: true });
    await expect(createMember({ termId: term.id, name: "A", post: "President" })).rejects.toMatchObject({ status: 400 });
    await expect(createMember({ termId: term.id, name: "Abdul Karim", post: "President", facebookUrl: "javascript:alert(1)" })).rejects.toMatchObject({ status: 400 });
    await expect(createMember({ termId: "missing", name: "Abdul Karim", post: "President" })).rejects.toMatchObject({ status: 404 });
  });

  it("orders members, finds the President and deletes a term with its photos", async () => {
    const term = await createTerm({ title: "Committee", startYear: 2024, isCurrent: true });
    const photo = await saveContentImage(await processContentImage(await makeImage(600, 700)));
    await createMember({ termId: term.id, name: "Rahim Uddin", post: "Vice-President" });
    await createMember({ termId: term.id, name: "Karim Ahmed", post: "President", photoUrl: photo.url, sscBatch: "1985", lifeMemberNo: "12" });
    const current = await getCurrentCommittee();
    expect(current?.members.map((m) => m.name)).toEqual(["Rahim Uddin", "Karim Ahmed"]);
    expect(findPresident(current)?.name).toBe("Karim Ahmed");
    expect(await contentDirs()).toHaveLength(1);
    await deleteTerm(term.id);
    expect(await prisma.committeeMember.count()).toBe(0);
    expect(await contentDirs()).toEqual([]);
  });

  it("stores the President's message", async () => {
    expect((await getPresidentMessage()).message).toBe("");
    await setPresidentMessage({ message: "Welcome home.\r\n\r\nJoin us." }, "admin@example.test");
    expect(await getPresidentMessage()).toMatchObject({ message: "Welcome home.\n\nJoin us.", updatedBy: "admin@example.test" });
  });

  it("lets only admins manage it", async () => {
    await signIn("MODERATOR");
    expect((await createTermRoute(json({ title: "Committee", startYear: 2024 }))).status).toBe(403);
    await signIn("ADMIN");
    expect((await createTermRoute(json({ title: "Committee", startYear: 2024 }))).status).toBe(201);
  });
});

describe("notices", () => {
  it("shows only active notices, newest first", async () => {
    const first = await createNotice({ title: "AGM on Friday", content: "The annual general meeting is on Friday." }, "admin@example.test");
    const hidden = await createNotice({ title: "Old notice", content: "This notice is no longer valid.", isActive: false }, "admin@example.test");
    expect((await listActiveNotices()).map((n) => n.id)).toEqual([first.id]);
    expect(await getActiveNotice(hidden.id)).toBeNull();
    await updateNotice(hidden.id, { isActive: true }, "admin@example.test");
    expect(await getActiveNotice(hidden.id)).not.toBeNull();
    await expect(createNotice({ title: "Hi", content: "short" }, "a@x.test")).rejects.toMatchObject({ status: 400 });
    await expect(createNotice({ title: "Priority", content: "A notice with a bad priority.", priority: "LOUD" }, "a@x.test")).rejects.toMatchObject({ status: 400 });
  });

  it("can be posted by moderators", async () => {
    await signIn("MODERATOR");
    const res = await createNoticeRoute(json({ title: "Picnic notice", content: "The picnic moves to Saturday." }));
    expect(res.status).toBe(201);
    await signIn("ALUMNI");
    expect((await createNoticeRoute(json({ title: "Picnic notice", content: "The picnic moves to Saturday." }))).status).toBe(403);
  });
});

describe("constitution", () => {
  it("accepts only PDFs, and serves them publicly", async () => {
    expect(() => checkDocument(Buffer.from("not a pdf"))).toThrow(expect.objectContaining({ code: "INVALID_DOCUMENT" }));
    await signIn("ADMIN");
    const form = new FormData();
    form.append("file", new File([new Uint8Array(makePdf())], "c.pdf", { type: "application/pdf" }));
    const res = await uploadDocument(new Request("http://x/api", { method: "POST", body: form }));
    expect(res.status).toBe(201);
    const { id, url } = await res.json();
    const served = await serveDocument(new Request(`http://x${url}`), { params: Promise.resolve({ id, file: "document.pdf" }) });
    expect(served.headers.get("content-type")).toBe("application/pdf");
    expect((await serveDocument(new Request("http://x"), { params: Promise.resolve({ id, file: "../x" }) })).status).toBe(404);
  });

  it("needs an uploaded PDF and lists versions newest first", async () => {
    await expect(createConstitution({ title: "Constitution", year: 2010 })).rejects.toMatchObject({ status: 400 });
    await expect(createConstitution({ title: "Constitution", year: 2010, fileUrl: "https://x.example/c.pdf" })).rejects.toMatchObject({ status: 400 });
    const a = await saveDocument(makePdf());
    const b = await saveDocument(makePdf());
    await createConstitution({ title: "Constitution", year: 2006, fileUrl: a.url });
    await createConstitution({ title: "Constitution (amended)", year: 2014, fileUrl: b.url });
    expect((await listConstitutions()).map((d) => d.year)).toEqual([2014, 2006]);
  });
});

describe("sample association content", () => {
  it("fills every page, re-runs without duplicates, keeps real content and is removed by remove-demo", async () => {
    await seedAssociationDemo();
    await seedAssociationDemo();
    const current = await getCurrentCommittee();
    expect(current?.title).toBe("Executive Committee 2025–2027");
    expect(findPresident(current)?.name).toBe("Mohammad Abdul Karim");
    expect(await listPastTerms()).toHaveLength(3);
    expect(groupHonorEntries(await listHonorEntries()).map((g) => g.honour)).toEqual(["Founding members", "Past presidents", "Past general secretaries"]);
    expect(await listActiveNotices()).toHaveLength(3);
    const [doc] = await listConstitutions();
    expect(checkDocument(await fs.readFile(path.join(process.env.UPLOADS_DIR!, "documents", doc.fileUrl.split("/")[4], "document.pdf")))).toBeTruthy();
    expect((await getPresidentMessage()).message).toBe(DEMO_PRESIDENT_MESSAGE);

    // A real committee and a real message are never replaced.
    await removeDemoContent();
    expect(await prisma.committeeTerm.count()).toBe(0);
    expect(await listActiveNotices()).toEqual([]);
    expect((await getPresidentMessage()).message).toBe("");
    const real = await createTerm({ title: "Real committee", startYear: 2025, isCurrent: true });
    await setPresidentMessage({ message: "Real message." }, "admin@example.test");
    await seedAssociationDemo();
    expect((await getCurrentCommittee())?.id).toBe(real.id);
    expect((await getPresidentMessage()).message).toBe("Real message.");
    await removeDemoContent();
    expect((await getPresidentMessage()).message).toBe("Real message.");
  });
});

describe("honor board", () => {
  it("groups names by honour in the admin's order", async () => {
    await createHonorEntry({ honour: "Past presidents", name: "Abdul Karim", period: "2006–2010" });
    await createHonorEntry({ honour: "Founding members", name: "Rahim Uddin" });
    await createHonorEntry({ honour: "Past presidents", name: "Nazrul Islam", period: "2010–2014" });
    const groups = groupHonorEntries(await listHonorEntries());
    expect(groups.map((g) => [g.honour, g.entries.map((e) => e.name)])).toEqual([
      ["Past presidents", ["Abdul Karim", "Nazrul Islam"]],
      ["Founding members", ["Rahim Uddin"]],
    ]);
    await expect(createHonorEntry({ honour: "X", name: "Abdul Karim" })).rejects.toMatchObject({ status: 400 });
  });
});
