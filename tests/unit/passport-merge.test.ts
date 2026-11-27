import { describe, expect, it } from "vitest";
import { EMPTY_PASSPORT, fromRows, isEmptyPassport, mergePassports, toRows, type PassportData } from "@/lib/passport/model";

const account: PassportData = {
  ...EMPTY_PASSPORT,
  saved: ["pho-bo-ha-noi", "mi-quang"],
  tried: { "mi-quang": "2026-10-05", "bun-bo-hue": "2026-09-01" },
  notes: { "mi-quang": { rating: 4, note: "account note", updatedAt: "2026-10-05T10:00:00Z" } },
  collections: [{ name: "Đà Nẵng trip", dishIds: ["mi-quang"] }],
};
const guest: PassportData = {
  ...EMPTY_PASSPORT,
  saved: ["mi-quang", "com-tam-sai-gon"],
  savedVenues: ["pho-hoa-pasteur"],
  tried: { "mi-quang": "2026-11-20", "bun-bo-hue": "2026-08-15", "banh-xeo-nam-bo": "2026-11-21" },
  visited: { "banh-xeo-46a": "2026-11-21" },
  notes: { "mi-quang": { rating: 5, note: "guest note", updatedAt: "2026-11-20T09:00:00Z" }, "bun-bo-hue": { rating: 3, updatedAt: "2026-08-15T09:00:00Z" } },
  collections: [{ name: "Đà Nẵng trip", dishIds: ["cao-lau-hoi-an", "mi-quang"] }, { name: "Saigon", dishIds: ["com-tam-sai-gon"] }],
};

describe("guest → account passport merge", () => {
  const m = mergePassports(account, guest);
  it("keeps everything from both sides without duplicates", () => {
    expect(m.saved.sort()).toEqual(["com-tam-sai-gon", "mi-quang", "pho-bo-ha-noi"]);
    expect(m.savedVenues).toEqual(["pho-hoa-pasteur"]);
    expect(Object.keys(m.tried).sort()).toEqual(["banh-xeo-nam-bo", "bun-bo-hue", "mi-quang"]);
    expect(m.visited).toEqual({ "banh-xeo-46a": "2026-11-21" });
  });
  it("keeps the earliest tried date", () => {
    expect(m.tried["mi-quang"]).toBe("2026-10-05");
    expect(m.tried["bun-bo-hue"]).toBe("2026-08-15");
  });
  it("most recently updated note wins", () => {
    expect(m.notes["mi-quang"]).toMatchObject({ rating: 5, note: "guest note" });
    expect(m.notes["bun-bo-hue"]).toMatchObject({ rating: 3 });
  });
  it("merges collections by name", () => {
    expect(m.collections.find((c) => c.name === "Đà Nẵng trip")!.dishIds.sort()).toEqual(["cao-lau-hoi-an", "mi-quang"]);
    expect(m.collections.find((c) => c.name === "Saigon")!.dishIds).toEqual(["com-tam-sai-gon"]);
  });
  it("is idempotent (merging the result again changes nothing)", () => {
    expect(mergePassports(m, guest)).toEqual(m);
    expect(mergePassports(m, m)).toEqual(m);
  });
  it("round-trips through database rows; rows have unique keys", () => {
    const rows = toRows("u1", m);
    const key = (r: object) => JSON.stringify(Object.entries(r).filter(([k]) => !["occurred_on", "rating", "note", "updated_at"].includes(k)));
    for (const set of [rows.saved, rows.history, rows.notes]) expect(new Set(set.map(key)).size).toBe(set.length);
    const back = fromRows(rows.saved, rows.history, rows.notes);
    expect(back.saved.sort()).toEqual(m.saved.sort());
    expect(back.tried).toEqual(m.tried);
    expect(back.visited).toEqual(m.visited);
    expect(back.notes).toEqual(m.notes);
    expect(back.collections.map((c) => [c.name, c.dishIds.sort()])).toEqual(m.collections.map((c) => [c.name, c.dishIds.sort()]));
  });
  it("detects an empty guest passport", () => {
    expect(isEmptyPassport(EMPTY_PASSPORT)).toBe(true);
    expect(isEmptyPassport(guest)).toBe(false);
  });
});
