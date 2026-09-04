import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatFileSize,
} from "@/utils/formatters";

// Normalise les espaces insécables (U+00A0 / U+202F) émis par Intl fr-FR.
const norm = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

describe("formatCurrency", () => {
  it("formate sans décimale et suffixe la devise", () => {
    expect(norm(formatCurrency(1500000, "GNF"))).toBe("1 500 000 GNF");
    expect(norm(formatCurrency(0, "EUR"))).toBe("0 EUR");
  });

  it("utilise la devise par défaut de la config", () => {
    expect(formatCurrency(42)).toContain("42");
  });
});

describe("formatDate / formatDateTime", () => {
  it("formate une date fr-FR", () => {
    expect(formatDate(new Date(2024, 0, 5))).toBe("05/01/2024");
  });

  it("retombe sur le fallback si la date est nulle", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate(null, "N/A")).toBe("N/A");
  });

  it("formate date + heure", () => {
    expect(formatDateTime(new Date(2024, 0, 5, 9, 5))).toBe(
      "05/01/2024 09:05",
    );
  });
});

describe("formatFileSize", () => {
  it("gère les cas limites", () => {
    expect(formatFileSize(0)).toBe("0 o");
    expect(formatFileSize(-5)).toBe("0 o");
  });

  it("convertit les unités", () => {
    expect(formatFileSize(1024)).toBe("1.0 Ko");
    expect(formatFileSize(1536)).toBe("1.5 Ko");
    expect(formatFileSize(1048576)).toBe("1.0 Mo");
  });
});
