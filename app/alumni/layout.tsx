import type { Metadata } from "next";
import { pageMetadata, shareCard } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ image: shareCard("alumni"), path: "/alumni", title: "Alumni directory", description: "Search verified former students of Sabuj Shikshayatan Government High School by name, SSC batch, profession or city, and get back in touch." });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
