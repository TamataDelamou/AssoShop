import { describe, expect, it } from "vitest";
import { hashPin, verifyPin } from "@/lib/pin";

describe("PIN", () => {
  it("vérifie un PIN correct", () => {
    const hash = hashPin("1234");
    expect(hash).toContain(":");
    expect(verifyPin("1234", hash)).toBe(true);
  });

  it("rejette un PIN incorrect", () => {
    const hash = hashPin("1234");
    expect(verifyPin("0000", hash)).toBe(false);
  });

  it("rejette un hash malformé", () => {
    expect(verifyPin("1234", "not-a-hash")).toBe(false);
    expect(verifyPin("1234", "")).toBe(false);
  });

  it("génère un sel distinct à chaque hachage", () => {
    expect(hashPin("1234")).not.toBe(hashPin("1234"));
  });
});
