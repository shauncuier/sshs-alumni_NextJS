import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ path: "/contact", title: "Contact the committee", description: "Write to the Sabuj Shikshayatan alumni association about membership, the Golden Jubilee, donations or your batch. The committee replies by email." });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
