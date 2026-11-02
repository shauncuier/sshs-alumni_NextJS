"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isPrivatePath } from "@/lib/analytics-paths";

/** The site's Microsoft Clarity project; NEXT_PUBLIC_CLARITY_ID overrides it. */
export const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "z7bimv1ii2";

type ClarityFn = (command: string, ...args: unknown[]) => void;

/**
 * Microsoft Clarity (heatmaps and session recordings) on the live site's public pages.
 * Not loaded until a public page is visited, and stopped while the visitor is on a private
 * one (lib/analytics-paths.ts). Left out in development and tests. The security headers
 * in next.config.mjs allow Clarity's hosts.
 */
export default function ClarityAnalytics() {
  const path = usePathname() ?? "/";
  const isPrivate = isPrivatePath(path);
  // Once a public page loaded the script it stays; private pages only stop the recording.
  const [load, setLoad] = useState(!isPrivate);
  if (!isPrivate && !load) setLoad(true);
  const stopped = useRef(false);

  useEffect(() => {
    const clarity = (window as unknown as { clarity?: ClarityFn }).clarity;
    if (!clarity) return;
    if (isPrivate && !stopped.current) {
      clarity("stop");
      stopped.current = true;
    } else if (!isPrivate && stopped.current) {
      clarity("start");
      stopped.current = false;
    }
  }, [isPrivate]);

  if (process.env.NODE_ENV !== "production" || !CLARITY_PROJECT_ID || !load) return null;
  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
    </Script>
  );
}
