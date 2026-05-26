import { describe, expect, it } from "vitest";
import * as currencyService from "../../src/services/currencyService";
import * as discountService from "../../src/services/discountService";
import * as inventoryService from "../../src/services/inventoryService";
import * as localizationService from "../../src/services/localizationService";
import * as paymentService from "../../src/services/paymentService";
import * as returnsService from "../../src/services/returnsService";
import * as taxService from "../../src/services/taxService";

describe("currencyService (stub)", () => {
  it("exports the expected symbols", () => {
    expect(typeof currencyService.normalizeCurrencyCode).toBe("function");
    expect(typeof currencyService.roundCurrencyAmount).toBe("function");
    expect(typeof currencyService.getCurrencySettings).toBe("function");
    expect(typeof currencyService.getCurrencyConversionQuote).toBe("function");
    expect(Array.isArray(currencyService.SUPPORTED_CURRENCIES)).toBe(true);
    expect(typeof currencyService.CURRENCY_MINOR_UNITS).toBe("object");
  });

  it("normalizeCurrencyCode falls back when unknown", () => {
    expect(currencyService.normalizeCurrencyCode("xyz")).toBe("USD");
    expect(currencyService.normalizeCurrencyCode("usd")).toBe("USD");
    expect(currencyService.normalizeCurrencyCode(null)).toBe("USD");
  });

  it("roundCurrencyAmount respects minor units", () => {
    expect(currencyService.roundCurrencyAmount(1.234, "USD")).toBe(1.23);
    expect(currencyService.roundCurrencyAmount(1.5, "IDR")).toBe(2);
  });

  it("getCurrencySettings returns USD defaults", async () => {
    const settings = await currencyService.getCurrencySettings();
    expect(settings.baseCurrency).toBe("USD");
    expect(settings.enabledCurrencies).toContain("USD");
  });

  it("getCurrencyConversionQuote returns 1:1 conversion", async () => {
    const quote = await currencyService.getCurrencyConversionQuote({
      amount: 100,
      fromCurrency: "USD",
    });
    expect(quote.rate).toBe(1);
    expect(quote.convertedAmount).toBe(100);
  });
});

describe("discountService (stub)", () => {
  it("calculateDiscountAmount returns 0", () => {
    expect(discountService.calculateDiscountAmount(100, {})).toBe(0);
  });

  it("listDiscountRows returns []", async () => {
    await expect(discountService.listDiscountRows()).resolves.toEqual([]);
  });

  it("resolveApplicableDiscounts returns empty resolution", async () => {
    const result = await discountService.resolveApplicableDiscounts([], {});
    expect(result.discounts).toEqual([]);
    expect(result.totalDiscount).toBe(0);
    expect(result.breakdown).toEqual([]);
  });

  it("normalizeCodeList accepts arrays and strips empty entries", () => {
    expect(discountService.normalizeCodeList(["A", "", " B "])).toEqual(["A", "B"]);
  });

  it("normalizeCodeList returns [] for non-array input", () => {
    expect(discountService.normalizeCodeList("CODE")).toEqual([]);
    expect(discountService.normalizeCodeList(null)).toEqual([]);
  });
});

describe("taxService (stub)", () => {
  it("normalizeTaxBehavior", () => {
    expect(taxService.normalizeTaxBehavior("inclusive")).toBe("inclusive");
    expect(taxService.normalizeTaxBehavior("EXCLUSIVE")).toBe("exclusive");
    expect(taxService.normalizeTaxBehavior(null)).toBe("exclusive");
  });

  it("resolveTaxPricing returns zero tax", () => {
    const pricing = taxService.resolveTaxPricing(50);
    expect(pricing.taxAmount).toBe(0);
    expect(pricing.totalWithTax).toBe(50);
    expect(pricing.behavior).toBe("exclusive");
  });

  it("resolveMatchingTaxRule returns null", () => {
    expect(taxService.resolveMatchingTaxRule([], "US")).toBeNull();
  });

  it("getTaxRules returns []", async () => {
    await expect(taxService.getTaxRules()).resolves.toEqual([]);
  });
});

describe("paymentService (stub)", () => {
  it("getPaymentMethods returns []", async () => {
    await expect(paymentService.getPaymentMethods()).resolves.toEqual([]);
  });

  it("getTransactionStatusOptions returns canonical list", () => {
    const options = paymentService.getTransactionStatusOptions();
    expect(options).toEqual(
      expect.arrayContaining(["pending", "captured", "refunded", "failed"]),
    );
  });

  it("createTransactionEvent resolves to null (no-op)", async () => {
    await expect(paymentService.createTransactionEvent({})).resolves.toBeNull();
  });
});

describe("inventoryService (stub)", () => {
  it("getInventoryItems returns []", async () => {
    await expect(inventoryService.getInventoryItems()).resolves.toEqual([]);
  });

  it("recordStockMovement resolves to null (no-op)", async () => {
    await expect(inventoryService.recordStockMovement({})).resolves.toBeNull();
  });

  it("importInventoryCsv returns an empty result shape", async () => {
    const result = await inventoryService.importInventoryCsv("");
    expect(result).toEqual({ imported: 0, errors: [] });
  });
});

describe("returnsService (stub)", () => {
  it("normalizeReturnStatus enforces known statuses", () => {
    expect(returnsService.normalizeReturnStatus("APPROVED")).toBe("approved");
    expect(returnsService.normalizeReturnStatus("garbage")).toBe("pending");
    expect(returnsService.normalizeReturnStatus(null)).toBe("pending");
  });

  it("getReturnStatusOptions returns a snapshot of canonical statuses", () => {
    const options = returnsService.getReturnStatusOptions();
    expect(options).toEqual(
      expect.arrayContaining(["pending", "approved", "rejected", "refunded"]),
    );
  });

  it("getReturns returns []", async () => {
    await expect(returnsService.getReturns()).resolves.toEqual([]);
  });
});

describe("localizationService (stub)", () => {
  it("normalizeLocaleCode handles common formats", () => {
    expect(localizationService.normalizeLocaleCode("EN")).toBe("en");
    expect(localizationService.normalizeLocaleCode("id")).toBe("id");
    expect(localizationService.normalizeLocaleCode("zh")).toBe("en");
    expect(localizationService.normalizeLocaleCode("")).toBe("en");
  });

  it("getLocalizationSettings returns sane defaults", async () => {
    const settings = await localizationService.getLocalizationSettings();
    expect(settings.defaultLocale).toBe("en");
    expect(settings.enabledLocales).toContain("en");
  });

  it("getLocalizationTranslations returns []", async () => {
    await expect(localizationService.getLocalizationTranslations()).resolves.toEqual([]);
  });
});
