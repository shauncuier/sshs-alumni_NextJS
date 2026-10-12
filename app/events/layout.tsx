import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
  description: "Reunions, batch get-togethers and other alumni events. Register online and get your ticket.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
