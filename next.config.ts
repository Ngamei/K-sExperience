import type { NextConfig } from "next";

/**
 * K's Experience — Next.js config.
 *
 * STATIC_EXPORT=1 produces a fully offline, self-contained preview in `out/`
 * (no server required). The default build is a normal Vercel-compatible app.
 */
const isStaticExport = process.env.STATIC_EXPORT === "1";

/** Identifies a deployment (service-worker cache version). Vercel provides the commit; local builds use the build time. */
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? `local-${Date.now().toString(36)}`;

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
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
