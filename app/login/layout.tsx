import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ path: "/login", title: "Sign in", description: "Sign in to the Sabuj Shikshayatan alumni portal.", noindex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
