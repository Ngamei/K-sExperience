import { readFileSync } from "node:fs";
import path from "node:path";
import { VenuePhotoFileSchema } from "@/lib/data/venue-photos";

/** Curated venue photos as one static JSON file, validated at build time (local mode / Supabase fallback). */
export const dynamic = "force-static";

export async function GET() {
  const raw = JSON.parse(readFileSync(path.join(process.cwd(), "data/venue-photos.json"), "utf8"));
  return Response.json(VenuePhotoFileSchema.parse(raw));
}
