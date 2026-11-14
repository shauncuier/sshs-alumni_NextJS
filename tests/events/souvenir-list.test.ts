import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { souvenirList, souvenirXlsx, workLine } from "@/lib/events/souvenir-list";
import { GET } from "@/app/api/admin/events/[id]/souvenir-list/route";

let uploads: string;
beforeEach(async () => {
  session.user = null;
  uploads = fs.mkdtempSync(path.join(os.tmpdir(), "souvenir-"));
  vi.stubEnv("UPLOADS_DIR", uploads);
  await resetDatabase();
});
afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(uploads, { recursive: true, force: true });
});

/** The files in a zip (enough for the zips this project writes: stored or deflated). */
function unzip(buf: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let at = 0;
  while (buf.readUInt32LE(at) === 0x04034b50) {
    const method = buf.readUInt16LE(at + 8);
    const size = buf.readUInt32LE(at + 18);
    const nameLen = buf.readUInt16LE(at + 26);
    const extra = buf.readUInt16LE(at + 28);
    const start = at + 30 + nameLen + extra;
    const raw = buf.subarray(start, start + size);
    files.set(buf.toString("utf8", at + 30, at + 30 + nameLen), method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw));
    at = start + size;
  }
  return files;
}

/** Saves a photo the way lib/media/avatars.ts does and returns its address. */
function photo(id: string, file: "original.jpg" | "avatar.webp", bytes: string): string {
  fs.mkdirSync(path.join(uploads, "avatars", id), { recursive: true });
  fs.writeFileSync(path.join(uploads, "avatars", id, file), bytes);
  return `/api/media/avatars/${id}/${file}`;
}

async function member(status: "PENDING_PAYMENT" | "CONFIRMED" | "CHECKED_IN" | "CANCELLED", eventId: string, profile: Record<string, unknown>) {
  const m = await makeMember();
  await prisma.alumniProfile.update({ where: { userId: m.id }, data: profile });
  await prisma.eventRegistration.create({ data: { eventId, userId: m.id, status, totalFee: 1500 } });
  return m;
}

describe("souvenir list", () => {
  it("lists only paid members, by batch, with the Bangla name, work line and photo", async () => {
    const event = await makeEvent({ slug: "golden-jubilee", title: "Golden Jubilee" });
    await member("CONFIRMED", event.id, {
      sscBatch: 2010, fullName: "Rahim Uddin", fullNameBn: "রহিম উদ্দিন", designation: "Assistant Professor", company: "Chittagong College", phone: "01711000001", bloodGroup: "B+",
      // A hidden photo is included too: the committee wants every paid member's.
      gender: "FEMALE",
      avatarOriginalUrl: photo("a".repeat(32), "original.jpg", "JPEG-MASTER"),
      avatarUrl: `/api/media/avatars/${"a".repeat(32)}/avatar.webp`,
    });
    await member("CHECKED_IN", event.id, { sscBatch: 1995, fullName: "Karim Ahmed", profession: "Business", phone: "01811000002", avatarUrl: photo("b".repeat(32), "avatar.webp", "WEBP-ONLY") });
    await member("CONFIRMED", event.id, { sscBatch: 2020, fullName: "No Photo", avatarUrl: "/api/media/avatars/" + "c".repeat(32) + "/avatar.webp" }); // file missing
    await member("PENDING_PAYMENT", event.id, { sscBatch: 2001, fullName: "Not Paid Yet" });
    await member("CANCELLED", event.id, { sscBatch: 2002, fullName: "Cancelled One" });

    const { rows } = await souvenirList(event.id);
    expect(rows.map(({ photoPath, ...r }) => ({ ...r, hasPath: !!photoPath }))).toEqual([
      { batch: 1995, name: "Karim Ahmed", work: "Business", phone: "01811000002", bloodGroup: "", photo: "001-1995-Karim-Ahmed.webp", hasPath: true },
      { batch: 2010, name: "রহিম উদ্দিন", work: "Assistant Professor, Chittagong College", phone: "01711000001", bloodGroup: "B+", photo: "002-2010-Rahim-Uddin.jpg", hasPath: true },
      { batch: 2020, name: "No Photo", work: "Engineer", phone: "", bloodGroup: "", photo: null, hasPath: false },
    ]);
    expect(workLine({ profession: "Doctor", designation: "  " })).toBe("Doctor");
    await expect(souvenirList("no-such-event")).rejects.toMatchObject({ status: 404 });
  });

  it("writes a real Excel file: Bangla header, phones keep their leading 0, batch is a number", async () => {
    const file = souvenirXlsx([{ batch: 2010, name: "রহিম উদ্দিন & Co <x>", work: "=SUM(A1)", phone: "01711000001", bloodGroup: "B+", photo: null, photoPath: null }]);
    const parts = unzip(file);
    const sheet = parts.get("xl/worksheets/sheet1.xml")!.toString("utf8");
    expect(sheet).toContain("ক্রম");
    expect(sheet).toContain("রক্তের গ্রুপ");
    expect(sheet).toContain('<c r="B2"><v>2010</v></c>');
    expect(sheet).toContain(">01711000001<");
    expect(sheet).toContain("রহিম উদ্দিন &amp; Co &lt;x&gt;");
    expect(sheet).toContain("ছবি নেই");
    expect(sheet).not.toContain("<f>"); // text, never a formula
    expect(sheet).toContain('state="frozen"');
    expect(parts.get("[Content_Types].xml")!.toString()).toContain("spreadsheetml.sheet.main+xml");
  });

  it("downloads the list and photos as one zip, for admins only, and logs it", async () => {
    const event = await makeEvent({ slug: "golden-jubilee", title: "Golden Jubilee" });
    await member("CONFIRMED", event.id, { sscBatch: 2010, fullName: "Rahim Uddin", avatarOriginalUrl: photo("d".repeat(32), "original.jpg", "JPEG-BYTES") });
    await member("CONFIRMED", event.id, { sscBatch: 2011, fullName: "No Photo" });
    const get = () => GET(new Request(`http://x/api/admin/events/${event.id}/souvenir-list`), { params: Promise.resolve({ id: event.id }) });

    const plain = await makeMember();
    session.user = { id: plain.id, email: plain.email, role: "ALUMNI" };
    expect((await get()).status).toBe(403);

    const admin = await makeMember({ role: "ADMIN" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="golden-jubilee-souvenir.zip"');
    const files = unzip(Buffer.from(await res.arrayBuffer()));
    expect([...files.keys()]).toEqual(["golden-jubilee-souvenir-list.xlsx", "photos/001-2010-Rahim-Uddin.jpg"]);
    expect(files.get("photos/001-2010-Rahim-Uddin.jpg")!.toString()).toBe("JPEG-BYTES");
    const sheet = unzip(files.get("golden-jubilee-souvenir-list.xlsx")!).get("xl/worksheets/sheet1.xml")!.toString();
    expect(sheet).toContain("001-2010-Rahim-Uddin.jpg");
    const log = await prisma.activityLog.findFirstOrThrow({ where: { action: "event.souvenir_list_exported" } });
    expect(log.summary).toBe('Downloaded the souvenir list of "Golden Jubilee" (2 members, 1 photos)');
  });
});
