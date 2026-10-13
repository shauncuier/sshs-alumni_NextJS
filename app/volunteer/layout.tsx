import type { Metadata } from "next";
import { pageMetadata, shareCard } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ image: shareCard("volunteer"), path: "/volunteer", title: "Volunteer", description: "Volunteer for the Golden Jubilee and other alumni events of Sabuj Shikshayatan. Choose a team and the committee will get in touch." });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
