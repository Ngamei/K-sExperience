"use client";
import { useUser } from "@/lib/store/user";
import { useT } from "@/lib/i18n/use-t";
import { buildAvailabilityIndex } from "@/lib/food/availability";
import { useFoodData } from "@/components/food/food-data";
import { BusinessProfile } from "@/components/business/business-profile";
import type { BusinessProfileModel } from "@/lib/business/profile";

/** Food establishment page — the shared Business Profile Engine with a Food (restaurant) model. */
export function PlaceView({ id }: { id: string }) {
  const { t } = useT();
  const { restaurants, links, dishById } = useFoodData();
  const saved = useUser((s) => s.savedVenues.includes(id));
  const visited = useUser((s) => s.visited[id]);
  const toggleSavedVenue = useUser((s) => s.toggleSavedVenue);
  const toggleVisited = useUser((s) => s.toggleVisited);
  const r = restaurants.find((x) => x.id === id)!;
  const idx = buildAvailabilityIndex(restaurants, links, { includeSamples: r.isSample });
  // D67: a closed venue is not in the index (never recommended); its page still lists what it was known for.
  const ls = r.closure ? links.filter((l) => l.restaurantId === id && l.status !== "candidate" && l.isSample === r.isSample) : idx.linksByRestaurant.get(id) ?? [];
  const model: BusinessProfileModel = {
    id: r.id, type: "restaurant", name: r.name, area: r.neighbourhood, address: r.address,
    chips: r.highlights ?? [], priceRange: r.priceRange,
    phone: r.contact?.phone, website: r.contact?.website, social: r.contact?.social, hours: r.openingHours,
    mapsUrl: r.googleMapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${r.coordinates[1]},${r.coordinates[0]}`,
    precision: r.coordinatePrecision, isSample: r.isSample, closure: r.closure,
    links: r.deliveryLinks.map((d) => ({ label: d.provider, url: d.url })),
    sources: r.sources, lastVerified: r.lastVerified, management: "platform",
    offerings: ls.flatMap((l) => {
      const d = dishById.get(l.dishId);
      return d ? [{ id: d.id, name: d.nameVi, detail: d.nameEn, href: `/dishes/${d.id}/`, priceVnd: l.priceVnd, status: l.status, evidence: l.menuEvidence, lastVerified: l.lastVerified }] : [];
    }),
  };
  return (
    <BusinessProfile model={model} testid="place-detail" back={{ href: "/nearby/", label: t("nav.nearby") }} offeringTestId="place-offering"
      actions={{ saved, onSave: () => toggleSavedVenue(id), saveTestId: "save-venue", visitedOn: visited, onVisited: () => toggleVisited(id), visitedTestId: "visited-venue", mapsTestId: "google-maps-link" }} />
  );
}
