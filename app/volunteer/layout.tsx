import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Volunteer",
  description: "Join a volunteer team for alumni events.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
