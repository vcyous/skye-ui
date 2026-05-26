import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "../../src/shared/format";

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    const result = formatCurrency(1234.5);
    expect(result).toMatch(/\$1,234\.50/);
  });

  it("respects a custom currency code", () => {
    const result = formatCurrency(50, { currency: "EUR", locale: "en-US" });
    expect(result).toContain("€");
    expect(result).toContain("50");
  });

  it("coerces non-numeric input to 0", () => {
    expect(formatCurrency(null)).toMatch(/\$0\.00/);
    expect(formatCurrency(undefined)).toMatch(/\$0\.00/);
  });

  it("handles unknown 3-letter currency codes via Intl fallback", () => {
    const result = formatCurrency(10, { currency: "ZZZ" });
    expect(result).toMatch(/ZZZ\s*10\.00/);
  });

  it("falls back to a plain string when locale is invalid", () => {
    const result = formatCurrency(10, { locale: "x-invalid-locale-tag" });
    expect(result).toMatch(/USD\s*10\.00/);
  });
});

describe("formatDate", () => {
  it("returns '-' for falsy input", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate("")).toBe("-");
    expect(formatDate(undefined)).toBe("-");
  });

  it("returns '-' for invalid input", () => {
    expect(formatDate("not-a-date")).toBe("-");
  });

  it("formats valid ISO strings", () => {
    const result = formatDate("2026-05-26T12:00:00.000Z", { locale: "en-US" });
    expect(result).toMatch(/2026/);
  });

  it("accepts a Date instance", () => {
    const result = formatDate(new Date("2026-01-15"), { locale: "en-US" });
    expect(result).toMatch(/2026/);
  });
});

describe("formatDateTime", () => {
  it("includes time portion by default", () => {
    const result = formatDateTime("2026-05-26T15:30:00.000Z", {
      locale: "en-US",
      timeZone: "UTC",
    });
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/(3:30|15:30)/);
  });
});

describe("formatNumber", () => {
  it("formats with locale separators", () => {
    expect(formatNumber(1000000, { locale: "en-US" })).toBe("1,000,000");
  });

  it("coerces null/undefined to 0", () => {
    expect(formatNumber(null)).toBe("0");
  });
});

describe("formatPercent", () => {
  it("renders 0.25 as 25%", () => {
    const result = formatPercent(0.25, { locale: "en-US" });
    expect(result).toContain("25");
    expect(result).toContain("%");
  });
});
