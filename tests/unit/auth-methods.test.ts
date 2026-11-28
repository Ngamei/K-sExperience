import { describe, expect, it } from "vitest";
import { contactOf, displayNameOf, enabledAuthMethods, normalizePhone } from "@/lib/auth/methods";

describe("sign-in methods", () => {
  it("only lists methods switched on (default Google only)", () => {
    expect(enabledAuthMethods(undefined)).toEqual(["google"]);
    expect(enabledAuthMethods("google, facebook,phone")).toEqual(["google", "facebook", "phone"]);
    expect(enabledAuthMethods("phone,unknown")).toEqual(["phone"]);
    expect(enabledAuthMethods("")).toEqual([]);
  });
  it("normalizes Vietnamese mobile numbers to +84", () => {
    for (const x of ["0912 345 678", "912345678", "+84 912 345 678", "84912345678", "091-234-5678"]) expect(normalizePhone(x)).toBe("+84912345678");
    expect(normalizePhone("0388123456")).toBe("+84388123456");
    expect(normalizePhone("+6591234567")).toBe("+6591234567"); // other countries in international form
    for (const bad of ["", "12345", "0212345678", "09123456789", "abc"]) expect(normalizePhone(bad)).toBeNull();
  });
  it("greets phone-only and social accounts sensibly", () => {
    expect(displayNameOf({ phone: "84912345678" })).toBe("+84912345678");
    expect(displayNameOf({ email: "an@x.vn", user_metadata: { full_name: "Nguyễn An" } })).toBe("Nguyễn An");
    expect(displayNameOf({ email: "an@x.vn" }, "An N.")).toBe("An N.");
    expect(contactOf({ phone: "84912345678", email: "" })).toBe("+84912345678");
  });
});
