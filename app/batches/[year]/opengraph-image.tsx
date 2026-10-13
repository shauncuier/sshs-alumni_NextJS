import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getBatch, isBatchYear } from "@/lib/batches";

// One share card per batch: the site's card background (public/og/batch-bg.png, from
// design/share-cards/make_cards.py) with the batch year in the emblem.
export const alt = "SSC batch of Sabuj Shikshayatan Government High School";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CREAM = "#f4eddb";
const GOLD = "#d9b765";
const MINT = "#a9d8c2";

export default async function Image({ params }: { params: Promise<{ year: string }> }) {
  const year = Number((await params).year);
  const valid = Number.isInteger(year) && isBatchYear(year);
  const members = valid ? ((await getBatch(year).catch(() => null))?.totalAlumni ?? 0) : 0;
  const [bg, serif, display, sans] = await Promise.all([
    readFile(join(process.cwd(), "public/og/batch-bg.png")),
    readFile(join(process.cwd(), "assets/fonts/InstrumentSerif-Italic.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Gloock-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/WorkSans-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
        <img src={`data:image/png;base64,${bg.toString("base64")}`} width={1200} height={630} alt="" style={{ position: "absolute", left: 0, top: 0 }} />

        {/* The year inside the emblem (centre 945, 315; disc radius 104). */}
        <div style={{ position: "absolute", left: 841, top: 211, width: 208, height: 208, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: "WorkSans", fontSize: 13, letterSpacing: 6, color: MINT, paddingLeft: 6 }}>SSC</div>
          <div style={{ fontFamily: "Gloock", fontSize: 58, color: GOLD, lineHeight: 1, marginTop: 6 }}>{valid ? String(year) : "—"}</div>
        </div>

        <div style={{ position: "absolute", left: 72, top: 236, width: 600, display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "InstrumentSerif", fontStyle: "italic", fontSize: 70, lineHeight: 1.02, color: CREAM }}>{valid ? `SSC batch ${year}` : "SSC batches"}</div>
          <div style={{ fontFamily: "InstrumentSerif", fontStyle: "italic", fontSize: 38, color: GOLD, marginTop: 6 }}>{valid ? `Class of ${year}` : "Since 1977"}</div>
          <div style={{ width: 80, height: 2, background: GOLD, marginTop: 26, marginBottom: 20 }} />
          <div style={{ fontFamily: "WorkSans", fontSize: 21, lineHeight: 1.5, color: "rgba(244,237,219,0.88)" }}>
            {members > 0
              ? `${members} verified ${members === 1 ? "member" : "members"}. Find your classmates and the batch representative.`
              : "Find your classmates, the batch representative and reunion news."}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "InstrumentSerif", data: serif, style: "italic", weight: 400 },
        { name: "Gloock", data: display, style: "normal", weight: 400 },
        { name: "WorkSans", data: sans, style: "normal", weight: 400 },
      ],
    }
  );
}
