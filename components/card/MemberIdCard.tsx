import { schoolInfo } from "@/lib/data";

/**
 * The membership ID card, drawn at its real printed size: a standard bank-card
 * (CR80) of 85.6 × 54 mm. Every size is in mm / pt so a printout is exact; on screen
 * the caller scales it with CSS `zoom`. Same card on the member's /card page and in
 * the admin bulk print (/admin/id-cards).
 */

export interface IdCardData {
  alumniId: string;
  fullName: string;
  sscBatch: number | string;
  profession?: string;
  avatarUrl?: string;
  expiresAt?: number | string;
  qrDataUrl?: string;
}

const GREEN = "#06281e";
const GREEN_2 = "#0b3d2c";
const GOLD = "#d4a72c";

const cardBox: React.CSSProperties = {
  width: "85.6mm",
  height: "54mm",
  borderRadius: "3mm",
  overflow: "hidden",
  position: "relative",
  background: "#ffffff",
  fontFamily: "var(--font-sans, system-ui, sans-serif)",
  printColorAdjust: "exact",
  WebkitPrintColorAdjust: "exact",
  boxShadow: "0 0 0 0.2mm #d6dcd9",
  breakInside: "avoid",
};

function monthYear(v: number | string | undefined): string {
  if (v === undefined) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "Asia/Dhaka" });
}

/** Front: crest and association, photo, name, batch, member number. */
export function IdCardFront({ card }: { card: IdCardData }) {
  return (
    <div style={cardBox} className="text-slate-900">
      {/* Header band */}
      <div
        style={{
          height: "13.5mm",
          background: `linear-gradient(120deg, ${GREEN} 0%, ${GREEN_2} 70%, #11523b 100%)`,
          display: "flex",
          alignItems: "center",
          gap: "2.4mm",
          padding: "0 3.5mm",
          position: "relative",
        }}
      >
        <img src="/logo.png" alt="" style={{ width: "9.5mm", height: "9.5mm", borderRadius: "50%", background: "#fff", padding: "0.3mm", flexShrink: 0 }} />
        <div style={{ minWidth: 0, lineHeight: 1.15 }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: "7.6pt", letterSpacing: "0.02em" }}>SABUJ SHIKSHAYATAN</div>
          <div style={{ color: GOLD, fontWeight: 700, fontSize: "4.9pt", letterSpacing: "0.12em" }}>ALUMNI ASSOCIATION</div>
          <div lang="bn" style={{ color: "#cfe3da", fontSize: "4.6pt", marginTop: "0.3mm" }}>
            সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            border: `0.25mm solid ${GOLD}`,
            color: GOLD,
            borderRadius: "1mm",
            padding: "0.6mm 1.6mm",
            fontSize: "4.8pt",
            fontWeight: 800,
            letterSpacing: "0.14em",
            flexShrink: 0,
          }}
        >
          MEMBER
        </div>
      </div>
      <div style={{ height: "0.7mm", background: `linear-gradient(90deg, ${GOLD}, #f2d67a, ${GOLD})` }} />

      {/* Body */}
      <div style={{ display: "flex", gap: "3.4mm", padding: "3mm 3.5mm 0", position: "relative" }}>
        {/* Watermark crest */}
        <img
          src="/logo.png"
          alt=""
          style={{ position: "absolute", right: "-6mm", bottom: "-14mm", width: "34mm", height: "34mm", opacity: 0.06, pointerEvents: "none" }}
        />
        <img
          src={card.avatarUrl}
          alt={card.fullName}
          style={{
            width: "19.5mm",
            height: "24mm",
            objectFit: "cover",
            borderRadius: "1.6mm",
            border: `0.5mm solid ${GOLD}`,
            background: "#eef2f0",
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0, flex: 1, position: "relative" }}>
          <Label>Name</Label>
          <div
            style={{
              fontSize: card.fullName.length > 26 ? "7.4pt" : "8.6pt",
              fontWeight: 800,
              lineHeight: 1.15,
              color: GREEN,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {card.fullName}
          </div>
          {card.profession && (
            <div style={{ fontSize: "5.6pt", color: "#475569", marginTop: "0.5mm", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {card.profession}
            </div>
          )}
          <div style={{ display: "flex", gap: "4mm", marginTop: "2mm" }}>
            <div>
              <Label>SSC Batch</Label>
              <div style={{ fontSize: "8pt", fontWeight: 800, color: GREEN }}>{card.sscBatch}</div>
            </div>
            <div style={{ minWidth: 0 }}>
              <Label>Member No.</Label>
              <div style={{ fontSize: "5.9pt", fontWeight: 700, fontFamily: "ui-monospace, monospace", color: GREEN, marginTop: "0.6mm", whiteSpace: "nowrap" }}>
                {card.alumniId.replace(/^SSGHS-ALM-/, "")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer strip */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "5.2mm",
          background: GREEN,
          color: "#cfe3da",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 3.5mm",
          fontSize: "4.6pt",
          letterSpacing: "0.04em",
        }}
      >
        <span>Sitakunda, Chattogram · EIIN {schoolInfo.eiin}</span>
        <span style={{ color: GOLD, fontWeight: 700 }}>EST. {schoolInfo.established}</span>
      </div>
    </div>
  );
}

/** Back: the gate QR, what the card is, where to return it. */
export function IdCardBack({ card, site }: { card: IdCardData; site: string }) {
  const validUntil = monthYear(card.expiresAt);
  return (
    <div style={cardBox} className="text-slate-900">
      <div style={{ height: "3mm", background: GREEN }} />
      <div style={{ height: "0.6mm", background: GOLD }} />
      <div style={{ display: "flex", gap: "3.4mm", padding: "3mm 3.5mm 0" }}>
        <div style={{ flexShrink: 0, textAlign: "center" }}>
          <div style={{ width: "29mm", height: "29mm", border: `0.35mm solid ${GREEN}`, borderRadius: "1.6mm", padding: "0.8mm", background: "#fff" }}>
            {card.qrDataUrl ? (
              <img src={card.qrDataUrl} alt="Membership QR code" style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#eef2f0" }} />
            )}
          </div>
          <div style={{ fontSize: "4.6pt", color: "#475569", marginTop: "0.8mm", letterSpacing: "0.08em" }}>SCAN TO VERIFY</div>
        </div>
        <div style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
          <div style={{ fontSize: "6.6pt", fontWeight: 800, color: GREEN }}>Membership card</div>
          <p style={{ fontSize: "5pt", color: "#334155", marginTop: "0.8mm" }}>
            This card identifies a verified member of the Sabuj Shikshayatan Government High School Alumni Association. It is personal and not transferable.
          </p>
          <p style={{ fontSize: "5pt", color: "#334155", marginTop: "1.2mm" }}>
            <span style={{ fontWeight: 700 }}>If found, please return to</span>
            <br />
            {schoolInfo.associationEmail}
          </p>
          {validUntil && (
            <p style={{ fontSize: "5pt", color: "#334155", marginTop: "1.2mm" }}>
              <span style={{ fontWeight: 700 }}>QR valid until</span> {validUntil}
            </p>
          )}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "5.2mm",
          background: GREEN,
          color: "#cfe3da",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 3.5mm",
          fontSize: "4.6pt",
        }}
      >
        <span style={{ fontFamily: "ui-monospace, monospace", color: GOLD, fontWeight: 700 }}>{card.alumniId}</span>
        <span>{site}</span>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "4.4pt", fontWeight: 700, letterSpacing: "0.12em", color: "#64748b", textTransform: "uppercase" }}>{children}</div>
  );
}

/** "alumni.example.org" from the site address, for the back of the card. */
export function siteHost(origin: string): string {
  try {
    return new URL(origin).host.replace(/^www\./, "");
  } catch {
    return origin;
  }
}
