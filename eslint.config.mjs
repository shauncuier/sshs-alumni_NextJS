import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Uploaded images (avatars, news, gallery, banners) are already resized to WebP
      // with a thumbnail by lib/media, and several are private routes (proofs,
      // payment screenshots) that next/image's optimiser would fetch without the
      // admin's session. They stay <img loading="lazy">; static and stock images use
      // next/image (app/page.tsx, app/events/page.tsx).
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
