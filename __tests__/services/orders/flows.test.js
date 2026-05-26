import { describe, expect, it } from "vitest";
import {
  canTransition,
  FULFILLMENT_STATUS_FLOW,
  ORDER_STATUS_FLOW,
  PAYMENT_STATUS_FLOW,
} from "../../../src/services/orders/flows";

describe("canTransition", () => {
  it("allows transition to the same state (idempotent)", () => {
    expect(canTransition(ORDER_STATUS_FLOW, "not_paid", "not_paid")).toBe(true);
  });

  it("allows empty/undefined target (no-op)", () => {
    expect(canTransition(ORDER_STATUS_FLOW, "not_paid", "")).toBe(true);
    expect(canTransition(ORDER_STATUS_FLOW, "not_paid", null)).toBe(true);
    expect(canTransition(ORDER_STATUS_FLOW, "not_paid", undefined)).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(canTransition(ORDER_STATUS_FLOW, "NOT_PAID", "NEED_SHIP")).toBe(true);
  });

  it("rejects transitions not listed in the flow", () => {
    expect(canTransition(ORDER_STATUS_FLOW, "receive", "not_paid")).toBe(false);
    expect(canTransition(ORDER_STATUS_FLOW, "cancelled", "need_ship")).toBe(false);
  });

  it("rejects unknown source states (no allowed list)", () => {
    expect(canTransition(ORDER_STATUS_FLOW, "bogus", "not_paid")).toBe(false);
  });
});

describe("ORDER_STATUS_FLOW", () => {
  it("not_paid can advance to need_ship, cancel, or fail delivery", () => {
    expect(ORDER_STATUS_FLOW.not_paid).toEqual(
      expect.arrayContaining(["need_ship", "cancelled", "failed_delivery"]),
    );
  });

  it("receive and cancelled are terminal", () => {
    expect(ORDER_STATUS_FLOW.receive).toEqual([]);
    expect(ORDER_STATUS_FLOW.cancelled).toEqual([]);
  });
});

describe("PAYMENT_STATUS_FLOW", () => {
  it("refunded is terminal", () => {
    expect(PAYMENT_STATUS_FLOW.refunded).toEqual([]);
  });

  it("paid can go to partially_refunded or refunded", () => {
    expect(PAYMENT_STATUS_FLOW.paid).toEqual(
      expect.arrayContaining(["partially_refunded", "refunded"]),
    );
  });
});

describe("FULFILLMENT_STATUS_FLOW", () => {
  it("delivered is terminal", () => {
    expect(FULFILLMENT_STATUS_FLOW.delivered).toEqual([]);
  });

  it("shipped can go to delivered or failed", () => {
    expect(FULFILLMENT_STATUS_FLOW.shipped).toEqual(
      expect.arrayContaining(["delivered", "failed"]),
    );
  });
});
