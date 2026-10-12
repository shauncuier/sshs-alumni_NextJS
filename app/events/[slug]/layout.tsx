import type { Metadata } from "next";
import { getPublicEventBySlug } from "@/lib/events/service";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug).catch(() => null);
  if (!event) return { title: "Event not found" };
  const description = (event.subtitle || event.description || "").slice(0, 200);
  return {
    title: event.title,
    description,
    openGraph: { title: event.title, description, images: event.bannerImage ? [event.bannerImage] : undefined },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
