import type { NextConfig } from "next";

/**
 * K's Experience — Next.js config.
 *
 * STATIC_EXPORT=1 produces a fully offline, self-contained preview in `out/`
 * (no server required). The default build is a normal Vercel-compatible app.
 */
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // Separate output folder for the account-flow test build (see playwright.auth.config.ts).
  ...(process.env.BUILD_DIST_DIR ? { distDir: process.env.BUILD_DIST_DIR } : {}),
  ...(isStaticExport ? { output: "export" as const } : {}),
  // Same URL shape in server and static-export builds (avoids redirect hops, which also break SW navigations).
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
