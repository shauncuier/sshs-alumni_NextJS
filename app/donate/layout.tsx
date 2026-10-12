import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Donate",
  description: "Support scholarships and school projects run by the SSGHS Alumni Association.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
