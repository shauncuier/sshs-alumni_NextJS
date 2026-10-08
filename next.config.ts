import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["sharp", "tesseract.js", "@prisma/client", "mariadb", "bcryptjs"],
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
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
      "style-src 'self' 'unsafe-inline'",
      // ui-avatars.com draws the initials fallback for members without a photo.
      "img-src 'self' blob: data: https://images.unsplash.com https://upload.wikimedia.org https://ui-avatars.com",
      "font-src 'self' data:",
      "connect-src 'self' https: wss: ws:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
