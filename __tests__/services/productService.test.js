import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryBuilder } from "../helpers/supabaseMock";

vi.mock("../../src/services/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("../../src/services/storeService", () => ({
  getStoreContext: vi.fn(async () => ({
    authUser: { id: "user-1" },
    store: { id: "store-1", currency: "USD" },
  })),
}));

import { getProducts } from "../../src/services/productService";
import { supabase } from "../../src/services/supabaseClient";

const sampleRow = {
  id: "prod-1",
  title: "Widget",
  handle: "widget",
  description: "A widget",
  tags: ["new"],
  vendor: "Acme",
  product_type: "Hardware",
  seo_title: "Widget",
  seo_description: "A nice widget",
  media_urls: ["a.png"],
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
  product_variants: [
    {
      id: "var-1",
      sku: "SKU-1",
      price: "19.99",
      compare_at_price: "24.99",
      cost_price: "10.00",
      price_start_at: null,
      price_end_at: null,
      quantity_in_stock: 7,
      created_at: "2026-01-01T00:00:00.000Z",
    },
  ],
};

describe("getProducts", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  it("maps a Supabase row into the page-facing product shape", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ data: [sampleRow], error: null }),
    );

    const products = await getProducts("all");

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      id: "prod-1",
      name: "Widget",
      urlHandle: "widget",
      sku: "SKU-1",
      price: 19.99,
      compareAtPrice: "24.99",
      stock: 7,
      status: "active",
      vendor: "Acme",
      productType: "Hardware",
      mediaUrls: ["a.png"],
    });
    expect(products[0].variantId).toBe("var-1");
  });

  it("treats a price window with no bounds as active", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ data: [sampleRow], error: null }),
    );
    const products = await getProducts("all");
    expect(products[0].isPriceWindowActive).toBe(true);
  });

  it("returns [] when query returns null data", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ data: null, error: null }),
    );
    await expect(getProducts("all")).resolves.toEqual([]);
  });

  it("filters on status when not 'all'", async () => {
    const builder = makeQueryBuilder({ data: [], error: null });
    supabase.from.mockReturnValueOnce(builder);
    await getProducts("active");
    expect(builder.eq).toHaveBeenCalledWith("status", "active");
  });

  it("does NOT filter on status when status is 'all'", async () => {
    const builder = makeQueryBuilder({ data: [], error: null });
    supabase.from.mockReturnValueOnce(builder);
    await getProducts("all");
    expect(builder.eq).toHaveBeenCalledWith("store_id", "store-1");
    expect(
      builder.eq.mock.calls.find((call) => call[0] === "status"),
    ).toBeUndefined();
  });

  it("normalizes a row without variants into safe defaults", async () => {
    const row = { ...sampleRow, product_variants: [] };
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ data: [row], error: null }),
    );
    const [product] = await getProducts("all");
    expect(product.variantId).toBeNull();
    expect(product.sku).toBe("-");
    expect(product.price).toBe(0);
    expect(product.stock).toBe(0);
  });

  it("normalizes missing tags/mediaUrls into empty arrays", async () => {
    const row = { ...sampleRow, tags: null, media_urls: null };
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ data: [row], error: null }),
    );
    const [product] = await getProducts("all");
    expect(product.tags).toEqual([]);
    expect(product.mediaUrls).toEqual([]);
  });

  it("throws a normalized Error on supabase failure", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({
        data: null,
        error: { message: "rls denied" },
      }),
    );
    await expect(getProducts("all")).rejects.toThrow("rls denied");
  });
});
