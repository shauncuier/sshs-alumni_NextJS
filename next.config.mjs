// Plain JavaScript, not TypeScript: a .ts config needs the native SWC compiler, which
// does not load on Hostinger servers with an older glibc (< 2.29).
// The site's address (NEXT_PUBLIC_APP_URL) is https://www.<domain>. The bare domain
// sends visitors there, so sign-in cookies and the same-origin checks see one origin.
function bareDomainRedirect() {
  let url;
  try {
    url = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "");
  } catch {
    return [];
  }
  if (!url.hostname.startsWith("www.")) return [];
  return [
    {
      source: "/:path*",
      has: [{ type: "host", value: url.hostname.slice(4) }],
      destination: `${url.origin}/:path*`,
      permanent: true,
    },
  ];
}

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["sharp", "tesseract.js", "@prisma/client", "mariadb", "bcryptjs", "nodemailer"],
  allowedDevOrigins: [
    "*.ngrok-free.dev",
    "*.ngrok.app",
    "localhost:3000",
    // Phones on the local network open the dev server by LAN IP (next dev -H 0.0.0.0);
    // without this the HMR socket is rejected and the page never hydrates.
    "192.168.*.*",
  ],
  experimental: {
    // Enables forbidden()/unauthorized() with app/forbidden.tsx and app/unauthorized.tsx.
    authInterrupts: true,
    // Shared hosting reports every CPU of the machine but caps threads per account;
    // a build there sets NEXT_BUILD_CPUS so page-data workers stay within the limit.
    ...(process.env.NEXT_BUILD_CPUS ? { cpus: Number(process.env.NEXT_BUILD_CPUS) } : {}),
  },
  images: {
    // AVIF where the browser takes it (smallest), else WebP: what matters on mobile data.
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    // The optimizer serves only this site's own files and uploaded content images.
    localPatterns: [
      { pathname: "/*", search: "" },
      { pathname: "/og/**", search: "" },
      { pathname: "/sponsors/**", search: "" },
      { pathname: "/api/media/content/**", search: "" },
    ],
    // Optimized images are kept for 30 days (the default re-checks after 4 hours).
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
  async redirects() {
    return [
      // The gate scanner moved out of the admin console so moderators (gate volunteers) can use it.
      { source: "/admin/gate-verify", destination: "/gate", permanent: false },
      ...bareDomainRedirect(),
    ];
  },
  async headers() {
    const dev = process.env.NODE_ENV === "development";
    // Google Analytics (components/shared/GoogleAnalytics.tsx): the gtag script and the
    // hosts it sends visits to.
    const ga = {
      script: "https://www.googletagmanager.com",
      connect: "https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
      img: "https://*.google-analytics.com https://*.googletagmanager.com",
    };
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      // The admin verification page previews uploaded PDFs in a same-origin frame.
      "frame-ancestors 'self'",
      "form-action 'self'",
      // Next.js inlines its bootstrap scripts; without nonces 'unsafe-inline' is required.
      `script-src 'self' 'unsafe-inline' ${ga.script}` + (dev ? " 'unsafe-eval'" : ""),
      "style-src 'self' 'unsafe-inline'",
      // Initials avatars are inline data: SVGs (lib/avatar.ts).
      `img-src 'self' blob: data: https://images.unsplash.com https://upload.wikimedia.org ${ga.img}`,
      "font-src 'self' data:",
      // Live updates use same-origin Server-Sent Events; the dev server also needs its HMR socket.
      `connect-src 'self' ${ga.connect}` + (dev ? " ws: wss:" : ""),
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      ...(dev ? [] : ["upgrade-insecure-requests"]),
    ].join("; ");
    const headers = [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Camera for this site only (the gate scanner); never for other sites or embeds. It must
      // be allowed site-wide: the policy belongs to the page first loaded, and the admin menu
      // and the sign-in redirect open /gate without a reload, so a /gate-only rule never applied.
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      // The old XSS auditor is removed from browsers and could be abused; "0" turns it off.
      { key: "X-XSS-Protection", value: "0" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
    ];
    // HTTPS only in production. No "preload": joining the browsers' preload list is hard to undo.
    if (!dev) headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
    // Site images and icons in public/ change rarely (a changed design gets a new file
    // name); a week's cache spares a slow connection a round trip per file per visit.
    const staticAsset = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }];
    return [
      { source: "/:path*", headers },
      { source: "/:file(.*\\.(?:png|jpg|jpeg|webp|svg|ico))", headers: staticAsset },
      { source: "/og/:file*", headers: staticAsset },
    ];
  },
};

export default nextConfig;
