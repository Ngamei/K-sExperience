import { describe, expect, it } from "vitest";
import { googleMapsLink, googleMapsQuery, isGoogleMapsPlaceUrl } from "@/lib/geo/maps-link";

describe("Google Maps links", () => {
  it("keeps name + house number + street + district, drops branch tags, wards and 'formerly' notes", () => {
    expect(googleMapsQuery("Phở Hòa Pasteur", "260C Pasteur, Phường Xuân Hòa (formerly Ward 8, District 3), TP. Hồ Chí Minh")).toBe("Phở Hòa Pasteur, 260C Pasteur, Quận 3, Hồ Chí Minh");
    expect(googleMapsQuery("Cơm Tấm Ba Ghiền", "84 Đặng Văn Ngữ, Phường Phú Nhuận (formerly Ward 10, Phú Nhuận District), TP. Hồ Chí Minh")).toBe("Cơm Tấm Ba Ghiền, 84 Đặng Văn Ngữ, Phú Nhuận, Hồ Chí Minh");
    expect(googleMapsQuery("Okkio Caffe (Lê Lợi)", "122 Lê Lợi, Quận 1, TP. Hồ Chí Minh")).toBe("Okkio Caffe, 122 Lê Lợi, Quận 1, Hồ Chí Minh");
    expect(googleMapsQuery("UFiTU Pilates+ (Thảo Điền)", "3/38 Quốc Hương", "Thảo Điền")).toBe("UFiTU Pilates+, 3/38 Quốc Hương, Thảo Điền, Hồ Chí Minh");
  });
  it("an exact place link always wins; anything else falls back to the search link", () => {
    expect(googleMapsLink("X", "1 Lê Lợi, Quận 1", { placeUrl: "https://maps.app.goo.gl/abc123" })).toBe("https://maps.app.goo.gl/abc123");
    expect(googleMapsLink("X", "1 Lê Lợi, Quận 1", { placeUrl: "https://www.google.com/maps/search/?api=1&query=X" })).toMatch(/query=X%2C%201%20L/);
    expect(isGoogleMapsPlaceUrl("https://www.google.com/maps/place/B%C3%A1nh+M%C3%AC+110/@10.79,106.67")).toBe(true);
    expect(isGoogleMapsPlaceUrl("https://example.com/maps/place/x")).toBe(false);
  });
});
