import type { Metadata } from "next";
import { pageMetadata, shareCard } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ image: shareCard("donate"), path: "/donate", title: "Donate to the school", description: "Support scholarships and school projects at Sabuj Shikshayatan Government High School. Pay by bKash, Nagad or bank; the committee checks every donation." });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
