import type { Metadata } from "next";
import GalleryClient from "@/components/gallery/GalleryClient";
import { listPublishedPhotos } from "@/lib/gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos from school days, reunions and alumni events.",
};

// Photos from published albums only; unpublished albums never appear here.
export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  return <GalleryClient photos={await listPublishedPhotos()} />;
}
