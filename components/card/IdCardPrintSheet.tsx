"use client";

import { createPortal } from "react-dom";
import { IdCardBack, IdCardFront, type IdCardData } from "./MemberIdCard";

/**
 * A4 sheets of ID cards, only visible when printing. Rendered straight into <body>
 * so the page around it (sidebars, scrolling panels) can be hidden for the printout.
 *
 * - "pair": front and back side by side, 5 members a page. Cut out, fold along the
 *   middle (or put both halves in one laminating pouch).
 * - "duplex": 10 fronts on one page, their backs on the next, mirrored for a
 *   double-sided printer that flips on the long edge.
 */
export type PrintMode = "pair" | "duplex";

const PAGE_ID = "id-card-print";

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export default function IdCardPrintSheet({ cards, site, mode }: { cards: IdCardData[]; site: string; mode: PrintMode }) {
  if (typeof document === "undefined" || cards.length === 0) return null;

  const pages: React.ReactNode[] = [];
  if (mode === "pair") {
    chunk(cards, 5).forEach((group, p) =>
      pages.push(
        <div key={`p${p}`} className="idp-page">
          {group.map((c) => (
            <div key={c.alumniId} className="idp-row">
              <IdCardFront card={c} />
              <IdCardBack card={c} site={site} />
            </div>
          ))}
        </div>
      )
    );
  } else {
    chunk(cards, 10).forEach((group, p) => {
      pages.push(
        <div key={`f${p}`} className="idp-page">
          {chunk(group, 2).map((row, r) => (
            <div key={r} className="idp-row">
              {row.map((c) => (
                <IdCardFront key={c.alumniId} card={c} />
              ))}
            </div>
          ))}
        </div>
      );
      // Backs mirrored left to right, so each lands behind its front.
      pages.push(
        <div key={`b${p}`} className="idp-page">
          {chunk(group, 2).map((row, r) => (
            <div key={r} className="idp-row idp-mirror">
              {row.map((c) => (
                <IdCardBack key={c.alumniId} card={c} site={site} />
              ))}
            </div>
          ))}
        </div>
      );
    });
  }

  return createPortal(
    <div id={PAGE_ID}>
      <style>{`
        #${PAGE_ID} { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
          body > *:not(#${PAGE_ID}) { display: none !important; }
          #${PAGE_ID} { display: block; }
          #${PAGE_ID} .idp-page { display: flex; flex-direction: column; gap: 2mm; align-items: center; break-after: page; }
          #${PAGE_ID} .idp-page:last-child { break-after: auto; }
          #${PAGE_ID} .idp-row { display: flex; gap: 4mm; width: 175.2mm; }
          #${PAGE_ID} .idp-mirror { flex-direction: row-reverse; }
        }
      `}</style>
      {pages}
    </div>,
    document.body
  );
}

/** Waits for every photo and QR on the sheet to load, then opens the print dialog. */
export async function printCardSheet(): Promise<void> {
  // Let React put the sheet in the page first.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const imgs = [...document.querySelectorAll<HTMLImageElement>(`#${PAGE_ID} img`)];
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((res) => {
            img.addEventListener("load", () => res(), { once: true });
            img.addEventListener("error", () => res(), { once: true });
          })
    )
  );
  window.print();
}
