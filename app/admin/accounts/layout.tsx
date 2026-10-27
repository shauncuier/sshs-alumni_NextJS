import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/seo";

// The site's "%s | name" template only reaches this segment, so the accounts pages get their own.
export const metadata: Metadata = { title: { default: "Accounts", template: `%s · Accounts | ${SITE_NAME}` } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
