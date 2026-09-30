import { afterAll, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PROOF_LIMITS, proofFilePath, processProof, removeProofDir, saveProof } from "@/lib/media/proofs";
import { PROOF_TYPES, isProofType, proofTypeLabel } from "@/lib/members/proof-types";
import { makeImage, makeImageWithExif, makePdf } from "../helpers/images";

afterAll(async () => {
  await fs.rm(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

const INVALID = "Please upload your proof as a JPEG, PNG, WebP or PDF file.";

describe("proof types", () => {
  it("lists the accepted documents with labels", () => {
    expect(PROOF_TYPES.map((t) => t.value)).toEqual([
      "SSC_CERTIFICATE",
      "SSC_MARKSHEET",
      "SSC_ADMIT_OR_REGISTRATION",
      "SCHOOL_TESTIMONIAL",
      "SCHOOL_ID_CARD",
      "OTHER",
    ]);
    expect(proofTypeLabel("SSC_MARKSHEET")).toBe("SSC marksheet / transcript");
    expect(proofTypeLabel("NOPE")).toBe("NOPE");
    expect(proofTypeLabel(null)).toBe("");
    expect(isProofType("OTHER")).toBe(true);
    expect(isProofType("other")).toBe(false);
    expect(isProofType(undefined)).toBe(false);
  });
});

describe("processProof", () => {
  it("re-encodes JPEG, PNG and WebP images as JPEG without metadata", async () => {
    for (const format of ["jpeg", "png", "webp"] as const) {
      const out = await processProof(await makeImage(900, 700, format));
      expect(out).toMatchObject({ mime: "image/jpeg", ext: "jpg" });
      const m = await sharp(out.data).metadata();
      expect(m).toMatchObject({ format: "jpeg", width: 900, height: 700 });
      expect(m.exif).toBeUndefined();
    }
  });

  it("strips EXIF after applying its rotation", async () => {
    const out = await processProof(await makeImageWithExif(1000, 700, 6));
    const m = await sharp(out.data).metadata();
    expect(m).toMatchObject({ width: 700, height: 1000 });
    expect(m.exif).toBeUndefined();
    expect(out.data.includes(Buffer.from("secret-owner"))).toBe(false);
  });

  it("shrinks big scans to 2400 px on the long side and never upscales", async () => {
    const big = await sharp((await processProof(await makeImage(3200, 1600, "png"))).data).metadata();
    expect([big.width, big.height]).toEqual([2400, 1200]);
    const small = await sharp((await processProof(await makeImage(300, 200))).data).metadata();
    expect([small.width, small.height]).toEqual([300, 200]);
  });

  it("stores a PDF unchanged", async () => {
    const pdf = makePdf();
    const out = await processProof(pdf);
    expect(out).toMatchObject({ mime: "application/pdf", ext: "pdf" });
    expect(out.data.equals(pdf)).toBe(true);
  });

  it("rejects text files, GIFs and anything that only pretends to be a document", async () => {
    await expect(processProof(Buffer.from("hello, I am a .pdf"))).rejects.toMatchObject({ code: "INVALID_PROOF", status: 400, message: INVALID });
    await expect(processProof(Buffer.from("PDF-1.4 not quite"))).rejects.toMatchObject({ code: "INVALID_PROOF" });
    await expect(processProof(await makeImage(800, 800, "gif"))).rejects.toMatchObject({ code: "INVALID_PROOF", message: INVALID });
    await expect(processProof(Buffer.alloc(0))).rejects.toMatchObject({ code: "INVALID_PROOF" });
  });

  it("rejects images with an enormous pixel count", async () => {
    const bomb = await sharp({ create: { width: 12000, height: 12000, channels: 3, background: "#808080" } }).png({ compressionLevel: 9 }).toBuffer();
    await expect(processProof(bomb)).rejects.toMatchObject({ code: "INVALID_PROOF", status: 400 });
  });

  it("rejects files over 10 MB", async () => {
    const big = Buffer.concat([makePdf(), Buffer.alloc(PROOF_LIMITS.maxBytes)]);
    expect(PROOF_LIMITS.maxBytes).toBe(10 * 1024 * 1024);
    await expect(processProof(big)).rejects.toMatchObject({
      code: "INVALID_PROOF",
      message: "The proof document must be 10 MB or smaller.",
    });
  });
});

describe("saveProof and proofFilePath", () => {
  it("writes the document into a random folder that can be removed", async () => {
    const saved = await saveProof(await processProof(makePdf()));
    expect(saved.id).toMatch(/^[a-f0-9]{32}$/);
    expect(saved.fileUrl).toBe(`/api/media/proofs/${saved.id}/document.pdf`);
    expect(saved.mime).toBe("application/pdf");
    expect(await fs.readdir(saved.dir)).toEqual(["document.pdf"]);
    expect(saved.dir).toBe(path.join(process.env.UPLOADS_DIR!, "proofs", saved.id));
    expect(proofFilePath(saved.id, "document.pdf")).toBe(path.join(saved.dir, "document.pdf"));
    await removeProofDir(saved.dir);
    await expect(fs.access(saved.dir)).rejects.toThrow();

    const image = await saveProof(await processProof(await makeImage(400, 300)));
    expect(image.fileUrl).toBe(`/api/media/proofs/${image.id}/document.jpg`);
    expect(await fs.readdir(image.dir)).toEqual(["document.jpg"]);
  });

  it("only resolves valid ids and the two known file names", () => {
    const id = "b".repeat(32);
    expect(proofFilePath(id, "document.pdf")).toBe(path.join(process.env.UPLOADS_DIR!, "proofs", id, "document.pdf"));
    expect(proofFilePath(id, "document.jpg")).not.toBeNull();
    expect(proofFilePath("../etc", "document.pdf")).toBeNull();
    expect(proofFilePath(`${"b".repeat(30)}..`, "document.pdf")).toBeNull();
    expect(proofFilePath("B".repeat(32), "document.pdf")).toBeNull();
    expect(proofFilePath(id, "../document.pdf")).toBeNull();
    expect(proofFilePath(id, "document.png")).toBeNull();
    expect(proofFilePath(id, "original.jpg")).toBeNull();
  });
});
