/**
 * Shared-engine ↔ Supabase row mapping (migrations 0005–0007). Used by the read path, Admin writes,
 * the seed generator and tests. Establishments reuse the Food restaurant row + `attributes`.
 */
import { toRestaurantRow, type RestaurantRow, type SourceRow } from "../lib/data/db-rows";
import type { ExperienceId } from "../experiences/registry";
import type { Establishment, ExperienceItem, Offering } from "./schema";

export interface ItemRow {
  id: string; experience_id: string; name_vi: string; name_en: string; alt_names: string[]; category: string;
  attributes: ExperienceItem["attributes"]; description_vi: string; description_en: string;
  photos: ExperienceItem["photos"]; sources: ExperienceItem["sources"]; verification_status: ExperienceItem["verification"]["status"]; dataset: ExperienceItem["dataset"];
}
export interface OfferingRow {
  item_id: string; establishment_id: string; status: Offering["status"]; menu_evidence: Offering["menuEvidence"] | null;
  price_min_vnd: number | null; price_max_vnd: number | null; price_unit: string | null; last_verified: string | null;
  primary_photo_url: string | null; photo_kind: string | null; photo_source_url: string | null; photo_attribution: string | null; photo_license: string | null; photo_last_checked_at: string | null;
}
export interface EstablishmentRow extends RestaurantRow { attributes: Establishment["attributes"] }
export interface TagRow { establishment_id: string; experience_id: string }

const nn = <T,>(v: T | undefined): T | null => (v === undefined ? null : v);

export const toItemRow = (i: ExperienceItem): ItemRow => ({
  id: i.id, experience_id: i.experienceId, name_vi: i.nameVi, name_en: i.nameEn, alt_names: i.altNames, category: i.category, attributes: i.attributes,
  description_vi: i.description.vi, description_en: i.description.en, photos: i.photos, sources: i.sources, verification_status: i.verification.status, dataset: i.dataset,
});
export const fromItemRow = (r: ItemRow): ExperienceItem => ({
  id: r.id, experienceId: r.experience_id as ExperienceId, nameVi: r.name_vi, nameEn: r.name_en, altNames: r.alt_names ?? [], category: r.category, attributes: r.attributes ?? {},
  description: { vi: r.description_vi, en: r.description_en }, photos: r.photos ?? [], sources: r.sources ?? [], verification: { status: r.verification_status }, dataset: r.dataset,
});

export const toOfferingRow = (o: Offering): OfferingRow => ({
  item_id: o.itemId, establishment_id: o.establishmentId, status: o.status, menu_evidence: nn(o.menuEvidence),
  price_min_vnd: nn(o.price?.minVnd), price_max_vnd: nn(o.price?.maxVnd), price_unit: nn(o.price?.unit), last_verified: nn(o.lastVerified),
  primary_photo_url: nn(o.photo?.url), photo_kind: nn(o.photo?.kind), photo_source_url: nn(o.photo?.sourceUrl), photo_attribution: nn(o.photo?.attribution),
  photo_license: nn(o.photo?.license), photo_last_checked_at: nn(o.photo?.lastCheckedAt),
});
export const fromOfferingRow = (r: OfferingRow): Offering => ({
  itemId: r.item_id, establishmentId: r.establishment_id, status: r.status, isSample: false,
  ...(r.menu_evidence ? { menuEvidence: r.menu_evidence } : {}),
  ...(r.price_min_vnd !== null && r.price_max_vnd !== null && r.price_unit ? { price: { minVnd: r.price_min_vnd, maxVnd: r.price_max_vnd, unit: r.price_unit } } : {}),
  ...(r.last_verified ? { lastVerified: r.last_verified } : {}),
  ...(r.primary_photo_url && r.photo_kind && r.photo_source_url && r.photo_attribution && r.photo_license && r.photo_last_checked_at
    ? { photo: { url: r.primary_photo_url, kind: r.photo_kind as NonNullable<Offering["photo"]>["kind"], sourceUrl: r.photo_source_url, attribution: r.photo_attribution, license: r.photo_license, lastCheckedAt: r.photo_last_checked_at } }
    : {}),
});

export const toEstablishmentRow = (e: Establishment): EstablishmentRow => ({
  ...toRestaurantRow({ ...e, venueType: e.venueType as never }), attributes: e.attributes ?? {},
});
export const toTagRows = (e: Establishment): TagRow[] => e.experiences.map((x) => ({ establishment_id: e.id, experience_id: x }));
export const toEstablishmentSourceRows = (e: Establishment): SourceRow[] =>
  e.sources.map((s) => ({ restaurant_id: e.id, title: s.title, url: nn(s.url), accessed: nn(s.accessed), note: nn(s.note) }));

export function fromEstablishmentRow(r: EstablishmentRow, tags: TagRow[], sources: SourceRow[]): Establishment {
  const src = (s: SourceRow) => ({ title: s.title, ...(s.url ? { url: s.url } : {}), ...(s.accessed ? { accessed: s.accessed } : {}), ...(s.note ? { note: s.note } : {}) });
  return {
    id: r.id, name: r.name, isSample: r.is_sample, address: r.address, neighbourhood: r.neighbourhood, coordinates: [r.lon, r.lat],
    ...(r.coordinate_precision ? { coordinatePrecision: r.coordinate_precision } : {}),
    ...(r.google_maps_url ? { googleMapsUrl: r.google_maps_url } : {}),
    ...(r.closure ? { closure: r.closure } : {}),
    ...(r.highlights?.length ? { highlights: r.highlights } : {}),
    venueType: r.venue_type, ...(r.price_range ? { priceRange: r.price_range } : {}),
    ...(r.opening_hours ? { openingHours: r.opening_hours } : {}), ...(r.contact ? { contact: r.contact } : {}),
    deliveryLinks: r.delivery_links ?? [], sources: sources.filter((s) => s.restaurant_id === r.id).map(src),
    ...(r.last_verified ? { lastVerified: r.last_verified } : {}),
    experiences: tags.filter((t) => t.establishment_id === r.id).map((t) => t.experience_id as ExperienceId),
    attributes: r.attributes ?? {},
  };
}
