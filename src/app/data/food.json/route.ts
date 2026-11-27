import { getFoodData } from "@/lib/data/catalogue";

/**
 * The whole food dataset as one static, cacheable JSON resource (prerendered at build time).
 * Loaded once by the client (TanStack Query + service worker) instead of being embedded in
 * every page payload. In Supabase mode this is where a live API would be called instead.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(getFoodData());
}
