import type { LngLat } from "../geo/geo";

/**
 * HCMC neighbourhood reference points for the Nearby "distance from" selector.
 * Since 1 July 2025 the district level was abolished; these familiar former-district names
 * are kept as neighbourhood labels because they remain how residents describe the city.
 * Coordinates are APPROXIMATE centre points used only for distance sorting.
 */
export const HCMC_NEIGHBOURHOODS: { id: string; name: string; center: LngLat }[] = [
  { id: "quan-1", name: "Quận 1", center: [106.7009, 10.7769] },
  { id: "quan-3", name: "Quận 3", center: [106.6842, 10.7838] },
  { id: "quan-4", name: "Quận 4", center: [106.7040, 10.7590] },
  { id: "quan-5", name: "Quận 5", center: [106.6667, 10.7547] },
  { id: "quan-7", name: "Quận 7", center: [106.7218, 10.7340] },
  { id: "quan-10", name: "Quận 10", center: [106.6675, 10.7730] },
  { id: "binh-thanh", name: "Bình Thạnh", center: [106.7094, 10.8106] },
  { id: "phu-nhuan", name: "Phú Nhuận", center: [106.6800, 10.8000] },
  { id: "tan-binh", name: "Tân Bình", center: [106.6525, 10.8015] },
  { id: "go-vap", name: "Gò Vấp", center: [106.6650, 10.8380] },
  { id: "thu-duc", name: "Thủ Đức", center: [106.7620, 10.8500] },
];

/** Default map centre: Bến Thành area. */
export const HCMC_CENTER: LngLat = [106.6983, 10.7725];
