import { afterAll, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AVATAR_LIMITS, avatarFilePath, processAvatar, removeAvatarDir, saveAvatar } from "@/lib/media/avatars";
import { makeImage, makeImageWithExif } from "../helpers/images";

afterAll(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

describe("processAvatar", () => {
  it("makes a print master and a 400x400 web avatar without metadata", async () => {
    const { original, avatar } = await processAvatar(await makeImageWithExif(800, 800));
    const o = await sharp(original).metadata();
    expect(o.format).toBe("jpeg");
    expect(Math.max(o.width!, o.height!)).toBeLessThanOrEqual(2400);
    expect(o.exif).toBeUndefined();
    const a = await sharp(avatar).metadata();
    expect(a).toMatchObject({ format: "webp", width: 400, height: 400 });
    expect(a.exif).toBeUndefined();
  });

  it("shrinks big photos to 2400 px on the long side but never upscales", async () => {
    const big = await processAvatar(await makeImage(3000, 2000, "png"));
    const m = await sharp(big.original).metadata();
    expect(m.width).toBe(2400);
    expect(m.height).toBe(1600);
    const small = await processAvatar(await makeImage(700, 900, "webp"));
    expect((await sharp(small.original).metadata()).width).toBe(700);
  });

  it("applies the EXIF rotation before stripping it", async () => {
    const { original } = await processAvatar(await makeImageWithExif(1000, 700, 6));
    const m = await sharp(original).metadata();
    expect(m).toMatchObject({ width: 700, height: 1000 });
  });

  it("rejects photos smaller than 600 x 600", async () => {
    await expect(processAvatar(await makeImage(500, 500))).rejects.toMatchObject({
      code: "INVALID_PHOTO",
      status: 400,
      message: "The photo must be at least 600 × 600 pixels.",
    });
    await expect(processAvatar(await makeImage(2000, 599))).rejects.toMatchObject({ code: "INVALID_PHOTO" });
  });

  it("rejects other formats and files that only pretend to be images", async () => {
    const msg = "Please upload a JPEG, PNG or WebP photo.";
    await expect(processAvatar(await makeImage(800, 800, "gif"))).rejects.toMatchObject({ code: "INVALID_PHOTO", message: msg });
    await expect(processAvatar(Buffer.from("hello, I am not a jpg"))).rejects.toMatchObject({ code: "INVALID_PHOTO", message: msg });
  });

  it("rejects images with an enormous pixel count even when the file is small", async () => {
    const bomb = await sharp({ create: { width: 12000, height: 12000, channels: 3, background: "#808080" } }).png({ compressionLevel: 9 }).toBuffer();
    expect(bomb.length).toBeLessThan(AVATAR_LIMITS.maxBytes);
    await expect(processAvatar(bomb)).rejects.toMatchObject({ code: "INVALID_PHOTO", status: 400 });
  });

  it("rejects photos over 5 MB", async () => {
    await expect(processAvatar(Buffer.alloc(AVATAR_LIMITS.maxBytes + 1))).rejects.toMatchObject({
      code: "INVALID_PHOTO",
      message: "The photo must be 5 MB or smaller.",
    });
  });
});

describe("saveAvatar and avatarFilePath", () => {
  it("writes both files into a random folder that can be removed", async () => {
    const files = await processAvatar(await makeImage(800, 800));
    const saved = await saveAvatar(files);
    expect(saved.id).toMatch(/^[a-f0-9]{32}$/);
    expect(saved.avatarUrl).toBe(`/api/media/avatars/${saved.id}/avatar.webp`);
    expect(saved.originalUrl).toBe(`/api/media/avatars/${saved.id}/original.jpg`);
    expect((await fs.readdir(saved.dir)).sort()).toEqual(["avatar.webp", "original.jpg"]);
    expect(avatarFilePath(saved.id, "avatar.webp")).toBe(path.join(saved.dir, "avatar.webp"));
    await removeAvatarDir(saved.dir);
    await expect(fs.access(saved.dir)).rejects.toThrow();
  });

  it("only resolves valid ids and the two known file names", () => {
    const id = "a".repeat(32);
    expect(avatarFilePath(id, "avatar.webp")).not.toBeNull();
    expect(avatarFilePath(id, "original.jpg")).not.toBeNull();
    expect(avatarFilePath("../etc", "avatar.webp")).toBeNull();
    expect(avatarFilePath(`${"a".repeat(30)}..`, "avatar.webp")).toBeNull();
    expect(avatarFilePath("A".repeat(32), "avatar.webp")).toBeNull();
    expect(avatarFilePath(id, "../avatar.webp" as never)).toBeNull();
    expect(avatarFilePath(id, "other.png" as never)).toBeNull();
  });
});
