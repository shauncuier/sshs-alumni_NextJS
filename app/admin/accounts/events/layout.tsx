import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/seo";

// Passes the accounts template on to each event's budget page.
export const metadata: Metadata = { title: { default: "Event budgets", template: `%s · Accounts | ${SITE_NAME}` } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
