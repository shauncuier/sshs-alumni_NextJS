/* One printed food or kit token (lib/events/tokens.ts): 63.5 × 38.1 mm, a standard
   21-per-A4 label size, so sheets can go on plain paper (cut) or label stock. */
import { tokenKind, type PrintableToken } from "@/lib/events/tokens";

export default function EventTokenTile({ token }: { token: PrintableToken }) {
  const kind = tokenKind(token.kind)!;
  return (
    <div
      style={{
        width: "63.5mm",
        height: "38.1mm",
        boxSizing: "border-box",
        outline: "0.2mm dashed #9aa8a2",
        outlineOffset: "-0.1mm",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#fff",
        color: "#1c2b25",
        fontFamily: "'Nirmala UI', 'Segoe UI', system-ui, sans-serif",
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
        breakInside: "avoid",
      }}
    >
      <div style={{ background: kind.color, color: "#fff", padding: "0.9mm 2.5mm", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontWeight: 800, fontSize: "9.5pt" }}>{kind.bn}</span>
        <span style={{ fontSize: "7pt", fontWeight: 700, letterSpacing: "0.04em" }}>{kind.en.toUpperCase()}</span>
      </div>
      <div style={{ display: "flex", gap: "2mm", padding: "1.4mm 2.2mm", flex: 1, minHeight: 0 }}>
        <img src={token.qrDataUrl} alt="" style={{ width: "24mm", height: "24mm", flexShrink: 0 }} />
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: "8.2pt",
              color: "#06281e",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {token.name}
          </div>
          <div style={{ fontSize: "7pt", color: "#475569", marginTop: "0.6mm" }}>SSC {token.batch ?? "—"}</div>
          <div style={{ fontSize: "7.4pt", fontWeight: 700, marginTop: "0.6mm" }}>
            {kind.perPerson ? `জন ${token.person} / ${token.people} · Person ${token.person} of ${token.people}` : "১টি কিট · 1 kit"}
          </div>
          <div style={{ marginTop: "auto", fontSize: "6.4pt", color: "#64748b" }}>
            একবার ব্যবহারযোগ্য · Valid once
            <br />
            <span style={{ fontFamily: "ui-monospace, monospace" }}>{token.slipNo}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
