import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound, unauthorized } from "next/navigation";
import EventTokenTile from "@/components/events/EventTokenTile";
import PaymentSlip from "@/components/events/PaymentSlip";
import PrintButton from "@/components/print/PrintButton";
import { logActivity } from "@/lib/activity-log";
import { slipsForEvent } from "@/lib/events/slips";
import { registrationListForPrint, type RegistrationListRow } from "@/lib/events/registration-list";
import { formatTaka } from "@/lib/events/pricing";
import { MAX_TOKENS_PER_PRINT, tokensForPrint, type PrintableToken } from "@/lib/events/tokens";
import { can } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { OFFLINE_SOURCE } from "@/lib/events/types";

export const metadata: Metadata = { title: "Print slips and tokens", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/**
 * Admin printing for one event, outside the admin shell so the printout is only the
 * sheets: ?what=slips (payment slips, 2 per A4) or ?what=tokens (food and kit tokens,
 * 21 per A4), for every confirmed registration, one batch (&batch=) or one (&reg=).
 * &source=offline limits any of these to the paper forms the committee typed in.
 * ?what=list prints the register: one row per confirmed registration with its totals.
 */
export default async function EventPrintPage({ params, searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) unauthorized();
  if (!can(user.role, "events")) forbidden();

  const { id } = await params;
  const sp = await searchParams;
  const whatParam = first(sp.what);
  const what = whatParam === "tokens" ? "tokens" : whatParam === "list" ? "list" : "slips";
  const registrationId = first(sp.reg) || null;
  const batch = Number(first(sp.batch)) || null;
  const offline = first(sp.source) === "offline";
  const source = offline ? OFFLINE_SOURCE : null;

  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!event) notFound();

  const confirmed = await prisma.eventRegistration.findMany({
    where: { eventId: id, status: { in: ["CONFIRMED", "CHECKED_IN"] }, ...(source ? { source } : {}) },
    select: { user: { select: { profile: { select: { sscBatch: true } } } } },
  });
  const batches = [...new Set(confirmed.map((r) => r.user.profile?.sscBatch).filter((b): b is number => typeof b === "number"))].sort((a, b) => a - b);

  let tokens: PrintableToken[] = [];
  let error: string | null = null;
  const slips = what === "slips" ? await slipsForEvent(id, { registrationId, batch, source }) : [];
  if (what === "tokens") {
    try {
      tokens = await tokensForPrint(id, { registrationId, batch, source });
    } catch (err) {
      if ((err as { code?: string }).code !== "TOO_MANY") throw err;
      error = (err as Error).message;
    }
  }
  const list: RegistrationListRow[] = what === "list" ? await registrationListForPrint(id, { batch, source }) : [];
  const count = what === "slips" ? slips.length : what === "list" ? list.length : tokens.length;
  const noun = { slips: "payment slip", tokens: "food/kit token", list: "registration list row" }[what];
  if (count > 0) {
    // Each printed token or slip stands for money or food: keep a record of who printed which.
    await logActivity({
      category: "EVENT",
      action: `${what}.printed`,
      summary: `Opened ${count} ${noun}${count === 1 ? "" : "s"} for printing: ${event.title}${offline ? ", paper forms" : ""}${batch ? `, batch ${batch}` : ""}`,
      actor: user,
      targetType: "Event",
      targetId: event.id,
      metadata: { what, batch, registrationId, source, count },
    });
  }

  const link = (params: Record<string, string | number | null>) => {
    const q = new URLSearchParams({ what });
    if (offline) q.set("source", "offline");
    for (const [k, v] of Object.entries(params)) if (v !== null && v !== "") q.set(k, String(v));
    return `/print/event/${id}?${q}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <style>{`
        @page { size: A4 ${what === "list" ? "landscape" : "portrait"}; margin: ${what === "tokens" ? "15.1mm 9.75mm" : "8mm 10mm"}; }
        .reg-list thead { display: table-header-group; }
        .reg-list tr { break-inside: avoid; }
        @media print { .no-print { display: none !important; } .sheet { box-shadow: none !important; margin: 0 !important; } }
        .sheet { break-after: page; }
        .sheet:last-child { break-after: auto; }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-3 justify-between">
          <div className="min-w-0">
            <Link href={`/admin/events/${id}?tab=attendees`} className="text-xs font-semibold text-emerald-800 hover:underline">
              ← Back to {event.title}
            </Link>
            <p className="text-sm font-bold text-slate-900">
              {what === "slips" ? `${count} payment slip${count === 1 ? "" : "s"}` : what === "list" ? `${count} registration${count === 1 ? "" : "s"} in the list` : `${count} food / kit token${count === 1 ? "" : "s"}`}
              {offline ? " · paper forms" : ""}
              {batch ? ` · batch ${batch}` : registrationId ? " · one registration" : offline ? "" : " · all confirmed"}
              {count > 0 && what !== "list" && <span className="font-normal text-slate-500"> · {Math.ceil(count / (what === "slips" ? 2 : 21))} A4 page(s)</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link href={`/print/event/${id}?what=slips${batch ? `&batch=${batch}` : ""}${offline ? "&source=offline" : ""}`} className={`px-3 py-2 rounded-xl border font-bold ${what === "slips" ? "bg-emerald-800 text-white border-emerald-800" : "border-slate-300"}`}>
              Payment slips
            </Link>
            <Link href={`/print/event/${id}?what=tokens${batch ? `&batch=${batch}` : ""}${offline ? "&source=offline" : ""}`} className={`px-3 py-2 rounded-xl border font-bold ${what === "tokens" ? "bg-emerald-800 text-white border-emerald-800" : "border-slate-300"}`}>
              Food tokens
            </Link>
            <Link href={`/print/event/${id}?what=list${batch ? `&batch=${batch}` : ""}${offline ? "&source=offline" : ""}`} className={`px-3 py-2 rounded-xl border font-bold ${what === "list" ? "bg-emerald-800 text-white border-emerald-800" : "border-slate-300"}`}>
              Entries list
            </Link>
            {!registrationId && (
              <Link
                href={`/print/event/${id}?what=${what}${batch ? `&batch=${batch}` : ""}${offline ? "" : "&source=offline"}`}
                aria-pressed={offline}
                className={`px-3 py-2 rounded-xl border font-bold ${offline ? "bg-amber-600 text-white border-amber-600" : "border-amber-300 text-amber-900"}`}
              >
                {offline ? "✓ Paper forms only" : "Paper forms only"}
              </Link>
            )}
            {!registrationId && (
              <span className="flex items-center gap-1 flex-wrap">
                <Link href={link({})} className={`px-2 py-1 rounded-lg border ${!batch ? "bg-slate-800 text-white border-slate-800" : "border-slate-300"}`}>All</Link>
                {batches.map((b) => (
                  <Link key={b} href={link({ batch: b })} className={`px-2 py-1 rounded-lg border ${batch === b ? "bg-slate-800 text-white border-slate-800" : "border-slate-300"}`}>
                    {b}
                  </Link>
                ))}
              </span>
            )}
            {count > 0 && <PrintButton />}
          </div>
        </div>
        <p className="max-w-5xl mx-auto mt-1 text-[11px] text-slate-500">
          Print on A4 at 100% (actual size) with background graphics on.{" "}
          {what === "list" ? "A4 landscape; the column headings repeat on every page. Tick and sign each row when you check it." : what === "tokens" ? `Cut along the dashed lines. Each token works once at its food counter. Up to ${MAX_TOKENS_PER_PRINT} tokens per print: pick a batch for big events.` : "Two slips per page; cut along the middle."}
        </p>
      </div>

      {error && <p className="no-print max-w-5xl mx-auto mt-6 px-4 text-sm font-bold text-rose-700">{error}</p>}
      {!error && count === 0 && <p className="no-print max-w-5xl mx-auto mt-6 px-4 text-sm text-slate-500">{offline ? "No confirmed paper-form registrations to print." : "No confirmed registrations to print."}</p>}

      <div className="py-6 print:py-0 flex flex-col items-center gap-6 print:gap-0 overflow-x-auto">
        {what === "slips" &&
          chunk(slips, 2).map((pair, i) => (
            <div key={i} className="sheet bg-white shadow-md flex flex-col items-center" style={{ width: "190mm", gap: "9mm", padding: "0" }}>
              {pair.map((s) => (
                <PaymentSlip key={s.registrationId} slip={s} />
              ))}
            </div>
          ))}
        {what === "list" && count > 0 && <RegistrationList rows={list} title={event.title} offline={offline} batch={batch} />}
        {what === "tokens" &&
          chunk(tokens, 21).map((page, i) => (
            <div key={i} className="sheet bg-white shadow-md" style={{ width: "190.5mm", display: "grid", gridTemplateColumns: "repeat(3, 63.5mm)", gridAutoRows: "38.1mm" }}>
              {page.map((t) => (
                <EventTokenTile key={t.id} token={t} />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

const dhaka = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });

/** Money in the list: 0 is "৳0" here, not "Free". */
const taka = (n: number) => (n === 0 ? "৳0" : formatTaka(n));
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The committee's register of entries: one row per registration, totals at the end. */
function RegistrationList({ rows, title, offline, batch }: { rows: RegistrationListRow[]; title: string; offline: boolean; batch: number | null }) {
  const people = rows.reduce((n, r) => n + r.headCount, 0);
  const fees = rows.reduce((n, r) => n + r.totalFee + r.donation, 0);
  const cash = rows.filter((r) => r.paymentMethod === "Cash").reduce((n, r) => n + r.totalFee + r.donation, 0);
  const th = "border border-slate-400 px-1.5 py-1 text-left font-bold bg-slate-100";
  const td = "border border-slate-300 px-1.5 py-1 align-top";
  return (
    <div className="sheet bg-white shadow-md p-6 print:p-0" style={{ width: "277mm" }}>
      <div className="flex items-end justify-between border-b-2 border-emerald-900 pb-2 mb-3">
        <div>
          <p className="text-base font-black text-emerald-900">
            {offline ? "Paper form entries" : "Registration list"}
            {batch ? ` · SSC ${batch}` : ""}
          </p>
          <p className="text-[11px] text-slate-600">{title} · SSGHS Alumni Association</p>
        </div>
        <p className="text-[10px] text-slate-500 text-right">
          Printed {dhaka(new Date().toISOString())}
          <br />
          {plural(rows.length, "registration")} · {plural(people, "person").replace("persons", "people")} · {taka(fees)}
        </p>
      </div>
      <table className="reg-list w-full border-collapse text-[9.5px] leading-tight">
        <thead>
          <tr>
            <th className={th}>#</th>
            {offline && <th className={th}>Form no.</th>}
            {offline && <th className={th}>Receipt</th>}
            <th className={th}>Slip</th>
            <th className={th}>Name</th>
            <th className={th}>Batch</th>
            <th className={th}>Mobile</th>
            <th className={`${th} text-right`}>People</th>
            <th className={`${th} text-right`}>Amount</th>
            <th className={th}>Paid by</th>
            <th className={th}>{offline ? "Entered by" : "Confirmed by"}</th>
            <th className={th}>Date</th>
            <th className={th} style={{ width: "18mm" }}>Checked</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.registrationId}>
              <td className={td}>{i + 1}</td>
              {offline && <td className={td}>{r.formNo ?? "—"}</td>}
              {offline && <td className={td}>{r.receiptNo ?? "—"}</td>}
              <td className={`${td} font-mono`}>{r.slipNo}</td>
              <td className={td}>
                <span className="font-bold">{r.name}</span>
                {r.email && <span className="block text-slate-500">{r.email}</span>}
              </td>
              <td className={td}>{r.batch ?? "—"}</td>
              <td className={`${td} whitespace-nowrap`}>{r.phone || "—"}</td>
              <td className={`${td} text-right`}>{r.headCount}</td>
              <td className={`${td} text-right whitespace-nowrap`}>{taka(r.totalFee + r.donation)}</td>
              <td className={td}>
                {r.paymentMethod ?? "—"}
                {r.transactionId && <span className="block font-mono text-slate-500">{r.transactionId}</span>}
              </td>
              <td className={`${td} break-all`}>{r.enteredBy ?? "—"}</td>
              <td className={`${td} whitespace-nowrap`}>{dhaka(r.createdAt)}</td>
              <td className={td} />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-amber-50">
            <td className={td} colSpan={offline ? 7 : 5}>
              Total: {plural(rows.length, "registration")}
            </td>
            <td className={`${td} text-right`}>{people}</td>
            <td className={`${td} text-right whitespace-nowrap`}>{taka(fees)}</td>
            <td className={td} colSpan={4}>
              Cash {taka(cash)} · Bangla QR / other {taka(fees - cash)}
            </td>
          </tr>
        </tfoot>
      </table>
      <div className="grid grid-cols-2 gap-16 mt-10 text-[10px] text-slate-600">
        <div className="border-t border-slate-500 pt-1">Checked by (name and signature)</div>
        <div className="border-t border-slate-500 pt-1">Treasurer (signature and date)</div>
      </div>
    </div>
  );
}
