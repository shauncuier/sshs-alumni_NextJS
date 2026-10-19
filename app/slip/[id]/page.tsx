import type { Metadata } from "next";
import Link from "next/link";
import { notFound, unauthorized } from "next/navigation";
import PaymentSlip from "@/components/events/PaymentSlip";
import PrintButton from "@/components/print/PrintButton";
import { slipFor } from "@/lib/events/slips";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

export const metadata: Metadata = { title: "Payment slip", robots: { index: false } };

type Params = { params: Promise<{ id: string }> };

// A member's printable payment slip (their own; admins may open any). Only for a
// confirmed registration: there is no slip before the committee has checked the money.
export default async function SlipPage({ params }: Params) {
  const user = await getSessionUser();
  if (!user) unauthorized();
  const { id } = await params;
  const slip = await slipFor(id, { id: user.id, isAdmin: isAdminRole(user.role) });
  if (!slip) notFound();

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white py-6 print:py-0 px-4 print:px-0">
      <style>{`@page { size: A4 portrait; margin: 10mm; } @media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print max-w-[190mm] mx-auto mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm font-semibold text-emerald-800 hover:underline">
          ← My dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Print, or choose “Save as PDF” to keep a copy.</span>
          <PrintButton label="Print / Save PDF" />
        </div>
      </div>
      <div className="flex justify-center overflow-x-auto">
        <PaymentSlip slip={slip} />
      </div>
    </div>
  );
}
