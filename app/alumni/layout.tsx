import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alumni directory",
  description: "Find verified SSGHS alumni by name, batch, profession or city.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
