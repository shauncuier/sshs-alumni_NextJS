import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SSGHS Alumni Association | Official Community Platform",
  description:
    "Official digital ecosystem and alumni network for Sabuj Shikshayatan Government High School (সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়), Chattogram, Bangladesh. EIIN: 105070.",
  keywords: [
    "SSGHS Alumni Association",
    "Sabuj Shikshayatan Government High School",
    "সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়",
    "Chattogram Alumni",
    "Sitakunda School Alumni",
    "School Reunion 2026",
    "Bangladesh Alumni Network",
  ],
  authors: [{ name: "SSGHS Alumni Executive Council" }],
  openGraph: {
    title: "SSGHS Alumni Association",
    description:
      "One school. Generations of memories. A lifetime of connections. The official platform for Sabuj Shikshayatan Govt. High School alumni.",
    siteName: "SSGHS Alumni Association",
    locale: "en_BD",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
