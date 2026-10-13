import EventsListClient from "@/components/events/EventsListClient";
import { listPublicEvents } from "@/lib/events/service";

export const dynamic = "force-dynamic";

// Rendered on the server with the events in the HTML (see EventsListClient).
export default async function EventsPage() {
  return <EventsListClient initialEvents={await listPublicEvents()} />;
}
