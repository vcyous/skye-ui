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

import {
  addUtcDays,
  calculateDeltaPercent,
  getDashboardSummary,
  startOfUtcDay,
} from "../../src/services/analyticsService";
import { supabase } from "../../src/services/supabaseClient";

describe("startOfUtcDay", () => {
  it("zeroes out the time portion at UTC midnight", () => {
    const result = startOfUtcDay("2026-05-26T15:30:00.000Z");
    expect(result.toISOString()).toBe("2026-05-26T00:00:00.000Z");
  });

  it("accepts a Date instance", () => {
    const result = startOfUtcDay(new Date("2026-01-15T23:59:00.000Z"));
    expect(result.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });
});

describe("addUtcDays", () => {
  it("advances by N whole days", () => {
    const result = addUtcDays("2026-01-01T00:00:00.000Z", 5);
    expect(result.toISOString()).toBe("2026-01-06T00:00:00.000Z");
  });

  it("supports negative deltas", () => {
    const result = addUtcDays("2026-01-10T00:00:00.000Z", -3);
    expect(result.toISOString()).toBe("2026-01-07T00:00:00.000Z");
  });
});

describe("calculateDeltaPercent", () => {
  it("returns 0 when both values are 0", () => {
    expect(calculateDeltaPercent(0, 0)).toBe(0);
  });

  it("returns 100 when previous is 0 but current is positive", () => {
    expect(calculateDeltaPercent(50, 0)).toBe(100);
  });

  it("computes a positive delta", () => {
    expect(calculateDeltaPercent(150, 100)).toBe(50);
  });

  it("computes a negative delta", () => {
    expect(calculateDeltaPercent(80, 100)).toBe(-20);
  });
});

describe("getDashboardSummary", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  it("aggregates orders + products + status counts", async () => {
    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [{ total_amount: "10.5" }, { total_amount: "5" }],
          error: null,
        }),
      )
      .mockReturnValueOnce(makeQueryBuilder({ count: 42, error: null }))
      .mockReturnValueOnce(makeQueryBuilder({ count: 12, error: null }))
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [
            { status: "not_paid" },
            { status: "not_paid" },
            { status: "need_ship" },
            { status: "ongoing_shipped" },
          ],
          error: null,
        }),
      );

    const summary = await getDashboardSummary();
    expect(summary.todaysSales).toBe(15.5);
    expect(summary.products).toBe(12);
    expect(summary.orders).toBe(42);
    expect(summary.topStatuses).toEqual({
      not_paid: 2,
      need_ship: 1,
      ongoing_shipped: 1,
    });
  });

  it("returns 0/empty when no data is found", async () => {
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(makeQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }));

    const summary = await getDashboardSummary();
    expect(summary.todaysSales).toBe(0);
    expect(summary.orders).toBe(0);
    expect(summary.products).toBe(0);
  });

  it("throws when any inner query errors", async () => {
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: null,
          error: { message: "permission denied" },
        }),
      )
      .mockReturnValueOnce(makeQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }));

    await expect(getDashboardSummary()).rejects.toThrow("permission denied");
  });
});
