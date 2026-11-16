import Script from "next/script";

/** The site's Google Tag Manager container; NEXT_PUBLIC_GTM_ID overrides it. */
export const GTM_CONTAINER_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-MVN6LSW9";

/**
 * Google Tag Manager on every page of the live site. Left out in development and
 * tests, like Google Analytics. It shares window.dataLayer with GoogleAnalytics.tsx.
 * The security headers in next.config.mjs allow the container script; a tag added in
 * the container that loads from another host must be allowed there too.
 */
export default function GoogleTagManager() {
  if (process.env.NODE_ENV !== "production" || !GTM_CONTAINER_ID) return null;
  return (
    <>
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`} strategy="afterInteractive" />
    </>
  );
}
