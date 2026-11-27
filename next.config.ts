import type { NextConfig } from "next";

/**
 * K's Experience — Next.js config.
 *
 * STATIC_EXPORT=1 produces a fully offline, self-contained preview in `out/`
 * (no server required). The default build is a normal Vercel-compatible app.
 */
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isStaticExport ? { output: "export" as const, trailingSlash: true } : {}),
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
