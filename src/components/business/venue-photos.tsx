"use client";
import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "@/lib/supabase/client";
import { READ_COLUMNS } from "@/lib/supabase/food";
import { fromVenuePhotoRow, VenuePhotoFileSchema, type VenuePhoto, type VenuePhotoRow } from "@/lib/data/venue-photos";

/** All curated venue photos, grouped by establishment. Supabase is the source of truth; the bundled file is the fallback. */
async function fetchVenuePhotos(): Promise<Map<string, VenuePhoto[]>> {
  const sb = getSupabase();
  let photos: VenuePhoto[] | null = null;
  if (sb) {
    const { data, error } = await sb.from("venue_photos").select(READ_COLUMNS.venue_photos).order("sort_order");
    if (!error) photos = ((data ?? []) as unknown as VenuePhotoRow[]).map(fromVenuePhotoRow);
  }
  if (!photos) photos = VenuePhotoFileSchema.parse(await (await fetch("/data/venue-photos.json")).json()).photos;
  const by = new Map<string, VenuePhoto[]>();
  for (const p of photos) by.set(p.venueId, [...(by.get(p.venueId) ?? []), p]);
  return by;
}
export function useVenuePhotos(venueId: string): VenuePhoto[] {
  const q = useQuery({ queryKey: ["venue-photos"], queryFn: fetchVenuePhotos, staleTime: Infinity });
  return q.data?.get(venueId) ?? [];
}
