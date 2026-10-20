import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireArea } from "@/lib/admin/require-admin";
import { getPublicEventBySlug } from "@/lib/events/service";
import OfflineEntryForm from "@/components/admin/OfflineEntryForm";

export const dynamic = "force-dynamic";

/** Committee: type in a paper registration form (approved and confirmed at once). */
export default async function OfflineEntryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("events");
  const { id } = await params;
  const row = await prisma.event.findUnique({ where: { id }, select: { slug: true, isMembershipEvent: true } });
  if (!row || !row.isMembershipEvent) notFound();
  const event = await getPublicEventBySlug(row.slug);
  if (!event) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link href={`/admin/events/${id}?tab=attendees`} className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to attendees
      </Link>
      <div>
        <h1 className="text-2xl font-black text-slate-900">Enter a paper form</h1>
        <p className="text-sm text-slate-600 mt-1">
          {event.title}. Type in the form exactly as written. The member is approved at once and gets the confirmation by SMS (and email, if given).
          No SMS code and no document upload: you have the paper copy.
        </p>
      </div>
      <OfflineEntryForm event={event} />
    </div>
  );
}
