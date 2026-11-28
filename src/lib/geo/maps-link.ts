/**
 * Google Maps links for establishments. Two kinds:
 *  - an exact place link a researcher copied from Google Maps → "Share" (always opens that one place);
 *  - otherwise a search link built from the venue name + house number + street + district, which Google opens
 *    directly on the place when it finds one clear match. Branch tags "(…)", ward names and "(formerly …)" notes
 *    are left out of the search text: Google's place names and ward data rarely contain them and they cause
 *    list results or no match. Nothing from Google is copied into our data.
 */
const PLACE_URL = /^https:\/\/(www\.google\.com\/maps\/place\/|maps\.app\.goo\.gl\/|goo\.gl\/maps\/|maps\.google\.com\/\?cid=)/;
export const isGoogleMapsPlaceUrl = (u: string | undefined | null): u is string => Boolean(u && PLACE_URL.test(u));

const CITY = /^(tp\.?\s*)?(hồ chí minh|ho chi minh( city)?|hcmc|sài gòn|saigon|việt nam|vietnam)$/i;
const WARD = /^(phường|ward|xã|p\.)\s/i;

/** "District 3" / "Phú Nhuận District" / "Quận 3" inside a note → "Quận 3" / "Phú Nhuận". */
function districtFrom(text: string): string | null {
  const n = text.match(/(?:district|quận)\s*(\d{1,2})\b/i);
  if (n) return `Quận ${n[1]}`;
  const named = text.match(/([\p{L} ]+?)\s+district\b/iu);
  return named ? named[1].trim() : null;
}

export function googleMapsQuery(name: string, address: string, districtHint?: string | null): string {
  const cleanName = name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  const notes = [...address.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);
  const parts = address.replace(/\([^)]*\)/g, "").split(",").map((p) => p.trim()).filter(Boolean)
    .filter((p) => !CITY.test(p) && !WARD.test(p));
  if (!parts.some((p) => /^(quận|huyện|thành phố thủ đức|thủ đức|q\.?\s*\d)/i.test(p) || districtFrom(p))) {
    const d = notes.map(districtFrom).find(Boolean);
    if (d) parts.push(d);
    else if (districtHint) parts.push(districtHint);
  }
  return [cleanName, ...parts, "Hồ Chí Minh"].join(", ");
}

/** The link to store: a researcher-supplied exact place link wins; otherwise the cleaned search link. */
export function googleMapsLink(name: string, address: string, opts: { placeUrl?: string | null; district?: string | null } = {}): string {
  if (isGoogleMapsPlaceUrl(opts.placeUrl)) return opts.placeUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleMapsQuery(name, address, opts.district))}`;
}
