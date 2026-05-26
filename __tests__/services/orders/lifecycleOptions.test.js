import { describe, expect, it } from "vitest";
import { getOrderLifecycleOptions } from "../../../src/services/orders/lifecycle";

describe("getOrderLifecycleOptions", () => {
  it("returns the current state plus its allowed transitions", () => {
    const options = getOrderLifecycleOptions({
      status: "not_paid",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
    });

    expect(options.status[0]).toBe("not_paid");
    expect(options.status).toEqual(
      expect.arrayContaining([
        "not_paid",
        "need_ship",
        "cancelled",
        "failed_delivery",
      ]),
    );
    expect(options.paymentStatus[0]).toBe("pending");
    expect(options.paymentStatus).toEqual(
      expect.arrayContaining(["authorized", "paid", "failed", "cancelled"]),
    );
    expect(options.fulfillmentStatus[0]).toBe("unfulfilled");
  });

  it("deduplicates the current state from the transitions list", () => {
    const options = getOrderLifecycleOptions({
      status: "receive",
      paymentStatus: "refunded",
      fulfillmentStatus: "delivered",
    });
    expect(options.status).toEqual(["receive"]);
    expect(options.paymentStatus).toEqual(["refunded"]);
    expect(options.fulfillmentStatus).toEqual(["delivered"]);
  });

  it("returns empty arrays when state is unknown", () => {
    const options = getOrderLifecycleOptions({
      status: "bogus",
      paymentStatus: "",
      fulfillmentStatus: null,
    });
    expect(options.status).toEqual(["bogus"]);
    expect(options.paymentStatus).toEqual([]);
    expect(options.fulfillmentStatus).toEqual([]);
  });

  it("is case-insensitive", () => {
    const options = getOrderLifecycleOptions({
      status: "NOT_PAID",
      paymentStatus: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
    });
    expect(options.status[0]).toBe("not_paid");
  });
});
