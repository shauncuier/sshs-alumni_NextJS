import GalleryClient from "@/components/gallery/GalleryClient";
import { listPublishedPhotos } from "@/lib/gallery";

// Photos from published albums only; unpublished albums never appear here.
export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  return <GalleryClient photos={await listPublishedPhotos()} />;
}
