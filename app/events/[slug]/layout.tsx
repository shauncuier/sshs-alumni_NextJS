import type { Metadata } from "next";
import { getPublicEventBySlug } from "@/lib/events/service";
import { eventDescription, pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug).catch(() => null);
  if (!event) return { title: "Event not found", robots: { index: false } };
  return pageMetadata({
    path: `/events/${slug}`,
    title: event.title,
    // A title that already names the school needs no site suffix.
    absoluteTitle: /shikshayatan|শিক্ষায়তন/i.test(event.title),
    description: eventDescription(event),
    image: { url: event.bannerImage, alt: event.title },
  });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
