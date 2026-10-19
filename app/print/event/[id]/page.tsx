import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound, unauthorized } from "next/navigation";
import EventTokenTile from "@/components/events/EventTokenTile";
import PaymentSlip from "@/components/events/PaymentSlip";
import PrintButton from "@/components/print/PrintButton";
import { logActivity } from "@/lib/activity-log";
import { slipsForEvent } from "@/lib/events/slips";
import { MAX_TOKENS_PER_PRINT, tokensForPrint, type PrintableToken } from "@/lib/events/tokens";
import { can } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";

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
 */
export default async function EventPrintPage({ params, searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) unauthorized();
  if (!can(user.role, "events")) forbidden();

  const { id } = await params;
  const sp = await searchParams;
  const what = first(sp.what) === "tokens" ? "tokens" : "slips";
  const registrationId = first(sp.reg) || null;
  const batch = Number(first(sp.batch)) || null;

  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!event) notFound();

  const confirmed = await prisma.eventRegistration.findMany({
    where: { eventId: id, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
    select: { user: { select: { profile: { select: { sscBatch: true } } } } },
  });
  const batches = [...new Set(confirmed.map((r) => r.user.profile?.sscBatch).filter((b): b is number => typeof b === "number"))].sort((a, b) => a - b);

  let tokens: PrintableToken[] = [];
  let error: string | null = null;
  const slips = what === "slips" ? await slipsForEvent(id, { registrationId, batch }) : [];
  if (what === "tokens") {
    try {
      tokens = await tokensForPrint(id, { registrationId, batch });
    } catch (err) {
      if ((err as { code?: string }).code !== "TOO_MANY") throw err;
      error = (err as Error).message;
    }
  }
  const count = what === "slips" ? slips.length : tokens.length;
  if (count > 0) {
    // Each printed token or slip stands for money or food: keep a record of who printed which.
    await logActivity({
      category: "EVENT",
      action: what === "slips" ? "slips.printed" : "tokens.printed",
      summary: `Opened ${count} ${what === "slips" ? "payment slip" : "food/kit token"}${count === 1 ? "" : "s"} for printing: ${event.title}${batch ? `, batch ${batch}` : ""}`,
      actor: user,
      targetType: "Event",
      targetId: event.id,
      metadata: { what, batch, registrationId, count },
    });
  }

  const link = (params: Record<string, string | number | null>) => {
    const q = new URLSearchParams({ what });
    for (const [k, v] of Object.entries(params)) if (v !== null && v !== "") q.set(k, String(v));
    return `/print/event/${id}?${q}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <style>{`
        @page { size: A4 portrait; margin: ${what === "tokens" ? "15.1mm 9.75mm" : "8mm 10mm"}; }
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
              {what === "slips" ? `${count} payment slip${count === 1 ? "" : "s"}` : `${count} food / kit token${count === 1 ? "" : "s"}`}
              {batch ? ` · batch ${batch}` : registrationId ? " · one registration" : " · all confirmed"}
              {count > 0 && <span className="font-normal text-slate-500"> · {Math.ceil(count / (what === "slips" ? 2 : 21))} A4 page(s)</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link href={`/print/event/${id}?what=slips${batch ? `&batch=${batch}` : ""}`} className={`px-3 py-2 rounded-xl border font-bold ${what === "slips" ? "bg-emerald-800 text-white border-emerald-800" : "border-slate-300"}`}>
              Payment slips
            </Link>
            <Link href={`/print/event/${id}?what=tokens${batch ? `&batch=${batch}` : ""}`} className={`px-3 py-2 rounded-xl border font-bold ${what === "tokens" ? "bg-emerald-800 text-white border-emerald-800" : "border-slate-300"}`}>
              Food tokens
            </Link>
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
          {what === "tokens" ? `Cut along the dashed lines. Each token works once at its food counter. Up to ${MAX_TOKENS_PER_PRINT} tokens per print: pick a batch for big events.` : "Two slips per page; cut along the middle."}
        </p>
      </div>

      {error && <p className="no-print max-w-5xl mx-auto mt-6 px-4 text-sm font-bold text-rose-700">{error}</p>}
      {!error && count === 0 && <p className="no-print max-w-5xl mx-auto mt-6 px-4 text-sm text-slate-500">No confirmed registrations to print.</p>}

      <div className="py-6 print:py-0 flex flex-col items-center gap-6 print:gap-0 overflow-x-auto">
        {what === "slips" &&
          chunk(slips, 2).map((pair, i) => (
            <div key={i} className="sheet bg-white shadow-md flex flex-col items-center" style={{ width: "190mm", gap: "9mm", padding: "0" }}>
              {pair.map((s) => (
                <PaymentSlip key={s.registrationId} slip={s} />
              ))}
            </div>
          ))}
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
