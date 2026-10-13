import type { Metadata } from "next";
import AuthProvider from "@/components/providers/AuthProvider";
import PwaProvider from "@/components/pwa/PwaProvider";
import NavigationProgress from "@/components/shared/NavigationProgress";
import { Suspense } from "react";
import "./globals.css";
import { ASSOCIATION_NAME, DEFAULT_SHARE_IMAGE, SITE_NAME, organizationJsonLd, siteOrigin, websiteJsonLd } from "@/lib/seo";
import JsonLd from "@/components/shared/JsonLd";

// No web fonts: the site uses the phone's own fonts (globals.css), so nothing extra
// is downloaded before text appears on a slow connection.

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "Sabuj Shikshayatan Alumni Association, Sitakunda",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Alumni association of Sabuj Shikshayatan Government High School (সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়), Sitakunda, Chattogram: batchmates, events and the Golden Jubilee 2026.",
  applicationName: SITE_NAME,
  authors: [{ name: ASSOCIATION_NAME }],
  // A 1-2 KB tab icon instead of the 32 KB logo.
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icon-32.png", type: "image/png", sizes: "32x32" }],
    apple: "/icon-192.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SSGHS Alumni",
  },
  openGraph: {
    siteName: ASSOCIATION_NAME,
    locale: "en_BD",
    alternateLocale: ["bn_BD"],
    type: "website",
    images: [DEFAULT_SHARE_IMAGE],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        {/* Shows a thin bar while the next page loads; pages stay on screen meanwhile. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <AuthProvider>
          <PwaProvider>{children}</PwaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
