import { describe, expect, it } from "vitest";
import { matchesQuery, normalizeVi, slugify } from "@/lib/search/normalize";

describe("Vietnamese accent-insensitive search", () => {
  it("strips tones and diacritics including đ", () => {
    expect(normalizeVi("Bánh xèo")).toBe("banh xeo");
    expect(normalizeVi("Đà Nẵng")).toBe("da nang");
    expect(normalizeVi("PHỞ BÒ")).toBe("pho bo");
    expect(normalizeVi("Bà Rịa – Vũng Tàu")).toBe("ba ria vung tau");
  });
  it("slugifies", () => {
    expect(slugify("Bún bò Huế")).toBe("bun-bo-hue");
  });
  it("matches without accents and in any token order", () => {
    expect(matchesQuery("Bún bò Huế", "bun bo")).toBe(true);
    expect(matchesQuery("Bún bò Huế", "hue bun")).toBe(true);
    expect(matchesQuery("Bún bò Huế", "BÚN")).toBe(true);
    expect(matchesQuery("Bún bò Huế", "pho")).toBe(false);
    expect(matchesQuery("Cơm tấm Sài Gòn", "")).toBe(true);
  });
  it("short tokens must be word prefixes (avoid 'bo' matching inside 'bot')", () => {
    expect(matchesQuery("Bột chiên", "bo")).toBe(true);
    expect(matchesQuery("Cơm tấm", "am")).toBe(false);
  });
});
