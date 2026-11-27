// Same algorithm as src/lib/search/normalize.ts → slugify().
export const slugify = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, "-");
