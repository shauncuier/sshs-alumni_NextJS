import type { Metadata } from "next";

export const metadata: Metadata = {
  // Keeps the site suffix on event pages below this layout.
  title: { default: "Events", template: "%s | SSGHS Alumni Association" },
  description: "Reunions, batch get-togethers and other alumni events. Register online and get your ticket.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
