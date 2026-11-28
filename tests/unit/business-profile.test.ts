import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BUSINESS_TYPE_DEFS, BUSINESS_TYPES, businessTypeOf, formatVnd, priceAccess } from "@/lib/business/profile";
import { EXPERIENCES } from "@/experiences/registry";

const mod = (id: string) => JSON.parse(readFileSync(`data/experiences/${id}.json`, "utf8")) as {
  items: { id: string; category: string }[]; establishments: { id: string; venueType: string }[]; offerings: { itemId: string; establishmentId: string }[];
};
const typesOf = (id: "coffee" | "bars" | "spa" | "sport") => {
  const d = mod(id);
  const cat = new Map(d.items.map((i) => [i.id, i.category]));
  return Object.fromEntries(d.establishments.map((e) => [e.id, businessTypeOf(id, e.venueType, [...new Set(d.offerings.filter((o) => o.establishmentId === e.id).map((o) => cat.get(o.itemId)!))])]));
};

describe("Business Profile Engine — business types", () => {
  it("nine types, each tied to an existing experience; Shopping is future-only", () => {
    expect(BUSINESS_TYPES).toHaveLength(9);
    for (const t of BUSINESS_TYPES) expect(EXPERIENCES.some((e) => e.id === BUSINESS_TYPE_DEFS[t].experience)).toBe(true);
    expect(BUSINESS_TYPES.filter((t) => BUSINESS_TYPE_DEFS[t].future)).toEqual(["boutique"]);
  });
  it("every business type has a default header image that exists in public/", async () => {
    const { existsSync } = await import("node:fs");
    for (const t of BUSINESS_TYPES) {
      const img = BUSINESS_TYPE_DEFS[t].defaultImage;
      expect(img, t).toMatch(/^\/images\/business-defaults\/[\w-]+\.webp$/);
      expect(existsSync(`public${img}`), `${t}: ${img}`).toBe(true);
    }
  });
  it("real establishments map to the expected profile types", () => {
    expect(new Set(Object.values(typesOf("coffee")))).toEqual(new Set(["cafe"]));
    expect(new Set(Object.values(typesOf("bars")))).toEqual(new Set(["bar"]));
    const spa = typesOf("spa");
    expect(spa["mam-xoi-do-hair-spa"]).toBe("head-spa");
    expect(spa["duong-sinh-co-ba-vo-van-tan"]).toBe("head-spa");
    expect(spa["le-spa-des-artistes"]).toBe("spa");
    const sport = typesOf("sport");
    expect(sport["ufitu-pilates-thao-dien-3-38-quoc-huong"]).toBe("pilates");
    expect(sport["pickoland-thao-dien"]).toBe("pickleball");
    expect(Object.values(sport).filter((t) => t === "pilates")).toHaveLength(2);
    expect(businessTypeOf("spa", "nail salon", [])).toBe("nail-salon");
    expect(businessTypeOf("spa", "spa", ["nails"])).toBe("nail-salon");
    expect(businessTypeOf("food", "eatery", [])).toBe("restaurant");
  });
});

describe("PriceEntitlement rule", () => {
  it("limits off (today): every viewer sees every recorded price", () => {
    for (const t of [null, "free", "plus", "premium"] as const) expect(priceAccess(t, { unlocked: false, usedUnlocks: 99 })).toBe("full");
  });
  it("limits on: Premium full; Free/Plus unlock until 5/30, already-unlocked menus stay open", () => {
    expect(priceAccess("premium", { unlocked: false, usedUnlocks: 1000 }, true)).toBe("full");
    expect(priceAccess("free", { unlocked: false, usedUnlocks: 4 }, true)).toBe("unlockable");
    expect(priceAccess("free", { unlocked: false, usedUnlocks: 5 }, true)).toBe("locked");
    expect(priceAccess(null, { unlocked: false, usedUnlocks: 5 }, true)).toBe("locked");
    expect(priceAccess("plus", { unlocked: false, usedUnlocks: 29 }, true)).toBe("unlockable");
    expect(priceAccess("free", { unlocked: true, usedUnlocks: 5 }, true)).toBe("full");
  });
  it("menu unlock model: guests cannot unlock; Plus locked at 30; an unlocked menu never needs quota", () => {
    expect(priceAccess(null, { unlocked: false, usedUnlocks: 0 }, true)).toBe("locked"); // guest: no complete prices
    expect(priceAccess("plus", { unlocked: false, usedUnlocks: 30 }, true)).toBe("locked");
    expect(priceAccess("plus", { unlocked: true, usedUnlocks: 30 }, true)).toBe("full");
    expect(priceAccess("free", { unlocked: false, usedUnlocks: 0 }, true)).toBe("unlockable");
  });
  it("formats VND", () => {
    expect(formatVnd({ min: 38000, max: 78000 })).toBe("38.000–78.000₫");
    expect(formatVnd({ min: 55000, max: 55000 })).toBe("55.000₫");
  });
});
