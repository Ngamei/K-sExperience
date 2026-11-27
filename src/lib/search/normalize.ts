/**
 * Vietnamese accent-insensitive normalisation.
 * "Bánh xèo" → "banh xeo", "Đà Nẵng" → "da nang", "PHỞ" → "pho".
 */
export function normalizeVi(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** URL-safe slug: "Bún bò Huế" → "bun-bo-hue". */
export function slugify(input: string): string {
  return normalizeVi(input).replace(/\s+/g, "-");
}

/** True when every token of `query` is a prefix of some token in `haystack` (both normalised). */
export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalizeVi(query);
  if (!q) return true;
  const hay = normalizeVi(haystack);
  const words = hay.split(" ");
  return q.split(" ").every((t) => hay.includes(t) && (t.length > 2 || words.some((w) => w.startsWith(t))));
}
