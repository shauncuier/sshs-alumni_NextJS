/* Printed payment slip of a confirmed registration (lib/events/slips.ts). Sizes are in
   mm / pt so a printout is exact: 190 × 132 mm, two to an A4 page. */
import type { PaymentSlipData } from "@/lib/events/slips";
import { formatTaka } from "@/lib/events/pricing";
import { schoolInfo } from "@/lib/data";

const GREEN = "#06281e";
const GOLD = "#b8892a";

function dhaka(iso: string | null, withTime = false): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit", hour12: true } : {}),
    timeZone: "Asia/Dhaka",
  });
}

const cell: React.CSSProperties = { padding: "1mm 2mm", borderBottom: "0.2mm solid #dde5e1", fontSize: "8.4pt", verticalAlign: "top" };
const key: React.CSSProperties = { ...cell, color: "#5b6b64", width: "26mm", whiteSpace: "nowrap" };

export default function PaymentSlip({ slip }: { slip: PaymentSlipData }) {
  return (
    <div
      className="payment-slip"
      style={{
        width: "190mm",
        height: "132mm",
        border: `0.5mm solid ${GREEN}`,
        borderRadius: "2.5mm",
        padding: "4mm 5mm",
        position: "relative",
        overflow: "hidden",
        background: "#fff",
        color: "#1c2b25",
        fontFamily: "'Nirmala UI', 'Segoe UI', system-ui, sans-serif",
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
        breakInside: "avoid",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "3mm", borderBottom: `0.7mm solid ${GOLD}`, paddingBottom: "2mm" }}>
        <img src="/logo.png" alt="" style={{ width: "13mm", height: "13mm" }} />
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 800, fontSize: "11pt", color: GREEN }}>সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয় প্রাক্তন শিক্ষার্থী পরিষদ</div>
          <div style={{ fontSize: "8pt", color: "#5b6b64" }}>Sabuj Shikshayatan Government High School Alumni Association · EIIN {schoolInfo.eiin}</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontWeight: 800, fontSize: "12pt", color: GREEN }}>পেমেন্ট স্লিপ</div>
          <div style={{ fontSize: "8pt", color: "#5b6b64" }}>Payment slip</div>
          <div style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: "9pt", marginTop: "0.5mm" }}>{slip.slipNo}</div>
        </div>
      </div>

      {/* Paid stamp */}
      <div
        style={{
          position: "absolute",
          right: "48mm",
          top: "22mm",
          transform: "rotate(-12deg)",
          border: "0.8mm solid #15803d",
          color: "#15803d",
          borderRadius: "2mm",
          padding: "1mm 3mm",
          fontWeight: 900,
          fontSize: "13pt",
          letterSpacing: "0.08em",
          opacity: 0.85,
        }}
      >
        PAID · পরিশোধিত
      </div>

      <div style={{ display: "flex", gap: "5mm", marginTop: "3mm" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr><td style={key}>নাম · Name</td><td style={{ ...cell, fontWeight: 800, color: GREEN }}>{slip.name}</td></tr>
              <tr><td style={key}>এসএসসি ব্যাচ</td><td style={cell}>{slip.batch ?? "—"}{slip.bloodGroup ? ` · Blood ${slip.bloodGroup}` : ""}</td></tr>
              <tr><td style={key}>মোবাইল · Mobile</td><td style={cell}>{slip.phone ?? "—"}</td></tr>
              <tr><td style={key}>অনুষ্ঠান · Event</td><td style={cell}>{slip.eventTitle}<br /><span style={{ color: "#5b6b64" }}>{dhaka(slip.eventDate)} · {slip.venue}</span></td></tr>
              <tr><td style={key}>জন · People</td><td style={cell}>{slip.headCount}</td></tr>
            </tbody>
          </table>

          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2.5mm" }}>
            <thead>
              <tr style={{ background: "#e8f1ed" }}>
                <th style={{ ...cell, textAlign: "left", color: GREEN }}>বিবরণ · Item</th>
                <th style={{ ...cell, textAlign: "center", color: GREEN, width: "14mm" }}>সংখ্যা</th>
                <th style={{ ...cell, textAlign: "right", color: GREEN, width: "26mm" }}>টাকা</th>
              </tr>
            </thead>
            <tbody>
              {slip.lines.map((l) => (
                <tr key={l.label}>
                  <td style={cell}>{l.label}</td>
                  <td style={{ ...cell, textAlign: "center" }}>{l.count}</td>
                  <td style={{ ...cell, textAlign: "right" }}>{formatTaka(l.amount)}</td>
                </tr>
              ))}
              {slip.donation > 0 && (
                <tr><td style={cell}>অনুদান · Donation</td><td style={cell} /><td style={{ ...cell, textAlign: "right" }}>{formatTaka(slip.donation)}</td></tr>
              )}
              <tr style={{ background: "#f6f2e4" }}>
                <td style={{ ...cell, fontWeight: 800 }}>মোট পরিশোধিত · Total paid</td>
                <td style={cell} />
                <td style={{ ...cell, textAlign: "right", fontWeight: 800, fontSize: "10pt" }}>{formatTaka(slip.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ width: "44mm", flexShrink: 0, textAlign: "center" }}>
          <img src={slip.ticketQr} alt="Entry ticket QR code" style={{ width: "36mm", height: "36mm", border: `0.3mm solid ${GREEN}`, borderRadius: "1.5mm", padding: "0.8mm" }} />
          <div style={{ fontSize: "7.5pt", color: "#5b6b64", marginTop: "0.8mm" }}>প্রবেশ টিকিট · Entry ticket</div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "2.5mm", textAlign: "left" }}>
            <tbody>
              <tr><td style={{ ...key, width: "auto" }}>মাধ্যম</td><td style={cell}>{slip.paymentMethod ?? "—"}</td></tr>
              <tr><td style={{ ...key, width: "auto" }}>TrxID</td><td style={{ ...cell, fontFamily: "ui-monospace, monospace", fontSize: "7.5pt", wordBreak: "break-all" }}>{slip.transactionId ?? "—"}</td></tr>
              <tr><td style={{ ...key, width: "auto" }}>Paid</td><td style={cell}>{dhaka(slip.paidOn)}</td></tr>
              <tr><td style={{ ...key, width: "auto" }}>Confirmed</td><td style={cell}>{dhaka(slip.confirmedOn)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ position: "absolute", left: "5mm", right: "5mm", bottom: "3mm", fontSize: "7.4pt", color: "#5b6b64", borderTop: "0.2mm solid #dde5e1", paddingTop: "1.2mm", display: "flex", justifyContent: "space-between", gap: "4mm" }}>
        <span>স্লিপটি সংরক্ষণ করুন; প্রবেশের সময় টিকিটের সাথে দেখান। Keep this slip; show it with your ticket. Computer-generated, no signature needed.</span>
        <span style={{ whiteSpace: "nowrap" }}>{schoolInfo.associationEmail}</span>
      </div>
    </div>
  );
}
