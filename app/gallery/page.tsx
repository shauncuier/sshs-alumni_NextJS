import type { Metadata } from "next";
import GalleryClient from "@/components/gallery/GalleryClient";
import { listPublishedPhotos } from "@/lib/gallery";
import { pageMetadata, shareCard } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ image: shareCard("gallery"), path: "/gallery", title: "Photo gallery", description: "Photos from school days, reunions and alumni events of Sabuj Shikshayatan Government High School, shared by the alumni association." });

// Photos from published albums only; unpublished albums never appear here.
export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  return <GalleryClient photos={await listPublishedPhotos()} />;
}
