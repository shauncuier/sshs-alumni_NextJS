import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Write to the SSGHS Alumni Association committee.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
