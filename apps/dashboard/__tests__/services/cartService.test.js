import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryBuilder } from "../helpers/supabaseMock";

vi.mock("../../src/services/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("../../src/services/storeService", () => ({
  getStoreContext: vi.fn(async () => ({
    authUser: { id: "user-1" },
    store: { id: "store-1" },
  })),
}));

import { ensureActiveCart, getCart } from "../../src/services/cartService";
import { supabase } from "../../src/services/supabaseClient";

describe("ensureActiveCart", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  it("returns existing active cart when one is found", async () => {
    const existing = { id: "cart-1", store_id: "store-1", status: "active" };
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ data: [existing], error: null }),
    );
    await expect(ensureActiveCart("store-1")).resolves.toEqual(existing);
  });

  it("creates a new cart when none exists", async () => {
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: { id: "cart-new", store_id: "store-1", status: "active" },
          error: null,
        }),
      );
    const result = await ensureActiveCart("store-1");
    expect(result.id).toBe("cart-new");
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("normalizes errors on lookup failure", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({
        data: null,
        error: { message: "rls denied" },
      }),
    );
    await expect(ensureActiveCart("store-1")).rejects.toThrow("rls denied");
  });
});

describe("getCart", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  it("returns an empty cart with subtotal 0 when no items", async () => {
    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [{ id: "cart-1", status: "active" }],
          error: null,
        }),
      )
      .mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }));
    const cart = await getCart();
    expect(cart.id).toBe("cart-1");
    expect(cart.items).toEqual([]);
    expect(cart.subtotal).toBe(0);
  });

  it("computes subtotal from line items", async () => {
    const items = [
      {
        id: "item-1",
        quantity: 2,
        unit_price: "10.50",
        product_variants: {
          id: "var-1",
          sku: "SKU-1",
          title: "Small",
          price: "10.50",
          quantity_in_stock: 100,
          products: { id: "prod-1", title: "Widget", store_id: "store-1", status: "active" },
        },
      },
      {
        id: "item-2",
        quantity: 1,
        unit_price: "5.00",
        product_variants: {
          id: "var-2",
          sku: "SKU-2",
          title: "Large",
          price: "5.00",
          quantity_in_stock: 50,
          products: { id: "prod-2", title: "Gadget", store_id: "store-1", status: "active" },
        },
      },
    ];
    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [{ id: "cart-1", status: "active" }],
          error: null,
        }),
      )
      .mockReturnValueOnce(makeQueryBuilder({ data: items, error: null }));
    const cart = await getCart();
    expect(cart.subtotal).toBe(26.0);
    expect(cart.items).toHaveLength(2);
    expect(cart.items[0]).toMatchObject({
      productName: "Widget",
      variantTitle: "Small",
      quantity: 2,
      unitPrice: 10.5,
      lineTotal: 21,
    });
  });

  it("falls back to variant.price when unit_price missing", async () => {
    const items = [
      {
        id: "item-1",
        quantity: 3,
        unit_price: null,
        product_variants: {
          id: "v",
          sku: "S",
          title: "T",
          price: "7",
          quantity_in_stock: 10,
          products: { id: "p", title: "P", store_id: "store-1", status: "active" },
        },
      },
    ];
    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [{ id: "cart-1", status: "active" }],
          error: null,
        }),
      )
      .mockReturnValueOnce(makeQueryBuilder({ data: items, error: null }));
    const cart = await getCart();
    expect(cart.items[0].unitPrice).toBe(7);
    expect(cart.subtotal).toBe(21);
  });
});
