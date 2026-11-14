/**
 * A small zip writer (node:zlib, no dependency): `zipBuffer` for a few small files (the
 * parts of an .xlsx, lib/xlsx.ts) and `zipStream` for big downloads such as the souvenir
 * photos, which reads and sends one file at a time so the server never holds them all.
 * XML and text are deflated; photos (already compressed) are stored as they are.
 */
import zlib from "node:zlib";

export interface ZipFile {
  name: string;
  data: Buffer;
  /** Store without compressing (for JPEG, PNG, WebP). */
  store?: boolean;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Turns zip offsets into a ZIP writer: each file gives its local part, then the directory closes it. */
class ZipWriter {
  private centrals: Buffer[] = [];
  private offset = 0;
  private count = 0;

  /** The bytes of one file (local header + data); remembers its directory entry. */
  add(file: ZipFile): Buffer {
    const name = Buffer.from(file.name, "utf8");
    const method = file.store ? 0 : 8;
    const packed = file.store ? file.data : zlib.deflateRawSync(file.data);
    const crc = crc32(file.data);
    if (this.offset + 30 + name.length + packed.length > 0xffffffff) throw new Error("The download is too large for one zip file.");

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(0, 10); // time + date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(0, 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(this.offset, 42);
    this.centrals.push(central, name);

    this.offset += 30 + name.length + packed.length;
    this.count += 1;
    return Buffer.concat([local, name, packed]);
  }

  /** The central directory and its end record. */
  finish(): Buffer {
    const size = this.centrals.reduce((n, b) => n + b.length, 0);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(this.count, 8);
    end.writeUInt16LE(this.count, 10);
    end.writeUInt32LE(size, 12);
    end.writeUInt32LE(this.offset, 16);
    return Buffer.concat([...this.centrals, end]);
  }
}

export function zipBuffer(files: ZipFile[]): Buffer {
  const w = new ZipWriter();
  const chunks = files.map((f) => w.add(f));
  return Buffer.concat([...chunks, w.finish()]);
}

/** A zip download made file by file; `files` is read lazily, one file in memory at a time. */
export function zipStream(files: AsyncIterable<ZipFile>): ReadableStream<Uint8Array> {
  const w = new ZipWriter();
  const it = files[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await it.next();
        if (next.done) {
          controller.enqueue(new Uint8Array(w.finish()));
          controller.close();
        } else {
          controller.enqueue(new Uint8Array(w.add(next.value)));
        }
      } catch (err) {
        controller.error(err);
      }
    },
    async cancel() {
      await it.return?.();
    },
  });
}
