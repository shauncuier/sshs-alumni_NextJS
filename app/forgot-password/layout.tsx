import type { Metadata } from "next";
import { pageMetadata, shareCard } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  image: shareCard("home"),
  path: "/forgot-password",
  title: "Reset your password",
  description: "Reset your Sabuj Shikshayatan alumni portal password with a code sent to your mobile number.",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
