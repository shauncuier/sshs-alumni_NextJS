import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/components/providers/AuthProvider";
import PwaProvider from "@/components/pwa/PwaProvider";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://ssghs-alumni.edu.bd"),
  title: {
    default: "SSGHS Alumni Association | Official Community Platform",
    template: "%s | SSGHS Alumni Association",
  },
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
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SSGHS Alumni",
  },
  openGraph: {
    title: "SSGHS Alumni Association | Official Community Platform",
    description:
      "One school. Generations of memories. A lifetime of connections. The official platform for Sabuj Shikshayatan Govt. High School alumni.",
    siteName: "SSGHS Alumni Association",
    locale: "en_BD",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
        alt: "SSGHS Alumni Association Crest",
      },
    ],
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
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <PwaProvider>{children}</PwaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
