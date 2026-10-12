import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["sharp", "tesseract.js", "@prisma/client", "mariadb", "bcryptjs", "nodemailer"],
  allowedDevOrigins: [
    "ungerminant-saran-normatively.ngrok-free.dev",
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
  },
  images: {
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
    ];
  },
  async headers() {
    const dev = process.env.NODE_ENV === "development";
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      // The admin verification page previews uploaded PDFs in a same-origin frame.
      "frame-ancestors 'self'",
      "form-action 'self'",
      // Next.js inlines its bootstrap scripts; without nonces 'unsafe-inline' is required.
      "script-src 'self' 'unsafe-inline'" + (dev ? " 'unsafe-eval'" : ""),
      "style-src 'self' 'unsafe-inline'",
      // ui-avatars.com draws the initials fallback for members without a photo.
      "img-src 'self' blob: data: https://images.unsplash.com https://upload.wikimedia.org https://ui-avatars.com",
      "font-src 'self' data:",
      // Live updates use same-origin Server-Sent Events; the dev server also needs its HMR socket.
      "connect-src 'self'" + (dev ? " ws: wss:" : ""),
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      ...(dev ? [] : ["upgrade-insecure-requests"]),
    ].join("; ");
    const headers = [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // No page may use the camera, except the gate scanner (rule below).
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      // The old XSS auditor is removed from browsers and could be abused; "0" turns it off.
      { key: "X-XSS-Protection", value: "0" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
    ];
    // HTTPS only in production. No "preload": joining the browsers' preload list is hard to undo.
    if (!dev) headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
    return [
      { source: "/:path*", headers },
      // Later rules override earlier ones for the same header: the gate scanner reads QR codes with the camera.
      { source: "/gate", headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" }] },
    ];
  },
};

export default nextConfig;
