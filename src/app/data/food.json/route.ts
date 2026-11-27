import { getFoodData } from "@/lib/data/catalogue";
import { DEV_DATA } from "@/lib/env";

/**
 * The whole food dataset as one static, cacheable JSON resource (prerendered at build time).
 * Loaded once by the client (TanStack Query + service worker) instead of being embedded in
 * every page payload. In Supabase mode this is where a live API would be called instead.
 */
export const dynamic = "force-static";

export function GET() {
  const data = getFoodData();
  // Fictional sample venues ship only in development/test builds (NEXT_PUBLIC_DEV_DATA=1).
  if (DEV_DATA) return Response.json(data);
  return Response.json({ ...data, restaurants: data.restaurants.filter((r) => !r.isSample), links: data.links.filter((l) => !l.isSample) });
}
