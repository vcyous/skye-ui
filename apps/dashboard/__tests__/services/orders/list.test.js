import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryBuilder } from "../../helpers/supabaseMock";

vi.mock("../../../src/services/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("../../../src/services/storeService", () => ({
  getStoreContext: vi.fn(async () => ({
    authUser: { id: "user-1" },
    store: { id: "store-1" },
  })),
}));

vi.mock("../../../src/services/utils/dbUtils", () => ({
  tableExists: vi.fn(async () => false),
}));

import { getOrders } from "../../../src/services/orders/list";
import { supabase } from "../../../src/services/supabaseClient";

const sampleRow = {
  id: "ord-1",
  order_number: "ORD-001",
  status: "need_ship",
  payment_status: "paid",
  fulfillment_status: "unfulfilled",
  total_amount: "99.99",
  currency_code: "USD",
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-02T00:00:00.000Z",
  customers: { first_name: "Ada", last_name: "Lovelace" },
};

describe("getOrders", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  it("maps the supabase row into the page list shape", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ data: [sampleRow], error: null }),
    );
    const orders = await getOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      id: "ord-1",
      orderNumber: "ORD-001",
      customerName: "Ada Lovelace",
      paymentStatus: "paid",
      fulfillmentStatus: "unfulfilled",
      total: 99.99,
      currencyCode: "USD",
    });
  });

  it("defaults customer name to 'Guest Customer' when no customer row", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({
        data: [{ ...sampleRow, customers: null }],
        error: null,
      }),
    );
    const [order] = await getOrders();
    expect(order.customerName).toBe("Guest Customer");
  });

  it("filters by status when not 'semua_orders'", async () => {
    const builder = makeQueryBuilder({ data: [], error: null });
    supabase.from.mockReturnValueOnce(builder);
    await getOrders("need_ship");
    expect(builder.eq).toHaveBeenCalledWith("status", "need_ship");
  });

  it("falls back to legacy mapping when fulfillment_status column missing", async () => {
    const builder = makeQueryBuilder({
      data: null,
      error: {
        message: 'column "fulfillment_status" does not exist',
      },
    });
    const fallbackBuilder = makeQueryBuilder({
      data: [{ ...sampleRow, status: "ongoing_shipped", fulfillment_status: undefined }],
      error: null,
    });
    supabase.from.mockReturnValueOnce(builder).mockReturnValueOnce(fallbackBuilder);

    const [order] = await getOrders();
    expect(order.fulfillmentStatus).toBe("shipped");
  });

  it("throws on unrelated supabase errors", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({
        data: null,
        error: { message: "network down" },
      }),
    );
    await expect(getOrders()).rejects.toThrow("network down");
  });

  it("returns empty list when no rows", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ data: [], error: null }),
    );
    await expect(getOrders()).resolves.toEqual([]);
  });
});
