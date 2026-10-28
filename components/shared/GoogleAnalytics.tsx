import Script from "next/script";

/** The site's Google Analytics 4 property; NEXT_PUBLIC_GA_ID overrides it. */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || "G-SE8HGWHXY1";

/**
 * Google Analytics (gtag.js) on every page of the live site. Left out in development
 * and tests, so local visits are not counted. The security headers in next.config.mjs
 * allow Google's analytics hosts.
 */
export default function GoogleAnalytics() {
  if (process.env.NODE_ENV !== "production" || !GA_MEASUREMENT_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
