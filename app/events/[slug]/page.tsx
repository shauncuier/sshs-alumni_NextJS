import { notFound } from "next/navigation";
import EventDetailClient from "@/components/events/EventDetailClient";
import JsonLd from "@/components/shared/JsonLd";
import { getPublicEventBySlug } from "@/lib/events/service";
import { eventJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

// Rendered on the server so the whole event (programme, fees, what's included) is in
// the HTML for search engines and slow phones; the client part adds the interactive bits.
export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) notFound();
  return (
    <>
      <JsonLd data={eventJsonLd(event)} />
      <EventDetailClient slug={slug} initialEvent={event} />
    </>
  );
}
