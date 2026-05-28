import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  toProductFormValues,
  toProductPayload,
} from "../../../src/features/products/productMapper";

describe("toProductPayload", () => {
  const baseValues = {
    name: "Widget",
    sku: "SKU-1",
    status: "active",
    price: "19.99",
    stock: "5",
  };

  it("coerces numeric fields", () => {
    const result = toProductPayload(baseValues, []);
    expect(result.price).toBe(19.99);
    expect(result.stock).toBe(5);
  });

  it("attaches mediaUrls", () => {
    const result = toProductPayload(baseValues, ["a.png", "b.png"]);
    expect(result.mediaUrls).toEqual(["a.png", "b.png"]);
  });

  it("parses tags from a comma-separated string", () => {
    const result = toProductPayload(
      { ...baseValues, tags: "fashion, summer, new arrival" },
      [],
    );
    expect(result.tags).toEqual(["fashion", "summer", "new arrival"]);
  });

  it("returns empty tags array when string is empty", () => {
    expect(toProductPayload(baseValues, []).tags).toEqual([]);
    expect(toProductPayload({ ...baseValues, tags: "" }, []).tags).toEqual([]);
  });

  it("nulls out unset compareAtPrice / costPrice", () => {
    const result = toProductPayload(baseValues, []);
    expect(result.compareAtPrice).toBeNull();
    expect(result.costPrice).toBeNull();
  });

  it("converts dayjs values to ISO strings", () => {
    const start = dayjs("2026-01-01T00:00:00.000Z");
    const end = dayjs("2026-02-01T00:00:00.000Z");
    const result = toProductPayload(
      { ...baseValues, priceStartAt: start, priceEndAt: end },
      [],
    );
    expect(result.priceStartAt).toBe(start.toISOString());
    expect(result.priceEndAt).toBe(end.toISOString());
  });

  it("nulls out missing date fields", () => {
    const result = toProductPayload(baseValues, []);
    expect(result.priceStartAt).toBeNull();
    expect(result.priceEndAt).toBeNull();
  });
});

describe("toProductFormValues", () => {
  it("returns {} for null input", () => {
    expect(toProductFormValues(null)).toEqual({});
    expect(toProductFormValues(undefined)).toEqual({});
  });

  it("joins tags array back into a comma-separated string", () => {
    const values = toProductFormValues({
      name: "X",
      sku: "SKU",
      status: "active",
      tags: ["a", "b", "c"],
    });
    expect(values.tags).toBe("a, b, c");
  });

  it("converts ISO date strings back to dayjs values", () => {
    const values = toProductFormValues({
      name: "X",
      sku: "SKU",
      status: "active",
      priceStartAt: "2026-01-01T00:00:00.000Z",
      priceEndAt: "2026-02-01T00:00:00.000Z",
    });
    expect(dayjs.isDayjs(values.priceStartAt)).toBe(true);
    expect(dayjs.isDayjs(values.priceEndAt)).toBe(true);
  });

  it("preserves null date fields", () => {
    const values = toProductFormValues({
      name: "X",
      sku: "SKU",
      status: "active",
    });
    expect(values.priceStartAt).toBeNull();
    expect(values.priceEndAt).toBeNull();
  });

  it("coerces nullable numeric fields", () => {
    const values = toProductFormValues({
      name: "X",
      sku: "SKU",
      status: "active",
      price: "12",
      stock: "3",
      compareAtPrice: 0,
      costPrice: null,
    });
    expect(values.price).toBe(12);
    expect(values.stock).toBe(3);
    expect(values.compareAtPrice).toBe(0);
    expect(values.costPrice).toBeNull();
  });
});
