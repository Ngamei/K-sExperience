/**
 * Venue photos for the business profile header (KEX-BIZ-03, D78).
 * A venue photo must show THIS establishment (exterior, interior, signage, or something served there) and carry its
 * source page, author and a licence that allows reuse. Never a photo of another venue, never a stock image.
 * Canonical file: data/venue-photos.json (curated); database: venue_photos (migration 0015).
 */
import { z } from "zod";

export const VENUE_PHOTO_KINDS = ["exterior", "interior", "signage", "served-here"] as const;
export type VenuePhotoKind = (typeof VENUE_PHOTO_KINDS)[number];
/** Licences we may display with attribution (Wikimedia Commons licences + explicit owner permission). */
export const ALLOWED_PHOTO_LICENSES = [/^CC BY(-SA)? [1-4]\.0( [A-Za-z-]+)?$/, /^CC0( 1\.0)?$/, /^Public domain$/i, /^Owner permission \(.+\)$/];
export const isAllowedLicense = (l: string) => ALLOWED_PHOTO_LICENSES.some((re) => re.test(l.trim()));

export const VenuePhotoSchema = z.object({
  venueId: z.string().min(1),
  url: z.url().startsWith("https://"),
  kind: z.enum(VENUE_PHOTO_KINDS),
  /** Page the photo comes from (e.g. the Commons file page). */
  sourceUrl: z.url().startsWith("https://"),
  attribution: z.string().min(1),
  license: z.string().refine(isAllowedLicense, "licence must allow reuse (CC BY / CC BY-SA / CC0 / public domain / owner permission)"),
  /** Date someone confirmed the photo shows this establishment. */
  lastCheckedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  caption: z.object({ en: z.string().min(1), vi: z.string().min(1) }).optional(),
});
export type VenuePhoto = z.infer<typeof VenuePhotoSchema>;
export const VenuePhotoFileSchema = z.object({
  metadata: z.object({ note: z.string(), updatedOn: z.string() }),
  photos: z.array(VenuePhotoSchema),
});

/** DB row shape (venue_photos). */
export interface VenuePhotoRow { establishment_id: string; url: string; kind: VenuePhotoKind; source_url: string; attribution: string; license: string; last_checked_at: string; caption: { en: string; vi: string } | null; sort_order: number }
export const toVenuePhotoRows = (photos: VenuePhoto[]): VenuePhotoRow[] => {
  const order = new Map<string, number>();
  return photos.map((p) => {
    const n = order.get(p.venueId) ?? 0; order.set(p.venueId, n + 1);
    return { establishment_id: p.venueId, url: p.url, kind: p.kind, source_url: p.sourceUrl, attribution: p.attribution, license: p.license, last_checked_at: p.lastCheckedAt, caption: p.caption ?? null, sort_order: n };
  });
};
export const fromVenuePhotoRow = (r: VenuePhotoRow): VenuePhoto => ({
  venueId: r.establishment_id, url: r.url, kind: r.kind, sourceUrl: r.source_url, attribution: r.attribution, license: r.license, lastCheckedAt: String(r.last_checked_at).slice(0, 10), ...(r.caption ? { caption: r.caption } : {}),
});
