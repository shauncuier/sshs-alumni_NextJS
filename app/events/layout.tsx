import type { Metadata } from "next";
import { pageMetadata, shareCard } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({ image: shareCard("events"), path: "/events", title: "Events and reunions", description: "Golden Jubilee 2026, batch reunions and other events of the Sabuj Shikshayatan alumni. Register online, pay by bKash or Nagad and get your ticket." }),
  // Event pages below keep the site name in their title.
  title: { default: "Events and reunions", template: "%s | Praktan Sabujian Parishad" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
