import { describe, expect, it } from "vitest";
import {
  isMissingColumnError,
  isMissingTableError,
  normalizeError,
} from "../../../src/services/utils/errorUtils";

describe("normalizeError", () => {
  it("returns a new Error with code + details copied", () => {
    const input = {
      message: "boom",
      code: "23505",
      details: "duplicate key value",
    };
    const result = normalizeError(input);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("boom");
    expect(result.code).toBe("23505");
    expect(result.details).toBe("duplicate key value");
  });

  it("falls back to error_description when message missing", () => {
    const result = normalizeError({ error_description: "oauth said no" });
    expect(result.message).toBe("oauth said no");
  });

  it("falls back to a generic message when nothing is provided", () => {
    const result = normalizeError({});
    expect(result.message).toBe("Unexpected request error");
  });

  it("handles null input gracefully", () => {
    const result = normalizeError(null);
    expect(result.message).toBe("Unexpected request error");
  });
});

describe("isMissingColumnError", () => {
  it("detects column-not-found by message", () => {
    const err = { message: 'column "fulfillment_status" does not exist' };
    expect(isMissingColumnError(err, "fulfillment_status")).toBe(true);
  });

  it("detects column-not-found by details", () => {
    const err = { details: 'column "captured_amount" does not exist' };
    expect(isMissingColumnError(err, "captured_amount")).toBe(true);
  });

  it("returns false when column name doesn't match", () => {
    const err = { message: 'column "other" does not exist' };
    expect(isMissingColumnError(err, "fulfillment_status")).toBe(false);
  });

  it("returns false for unrelated errors", () => {
    expect(isMissingColumnError({ message: "network down" }, "x")).toBe(false);
    expect(isMissingColumnError(null, "x")).toBe(false);
  });
});

describe("isMissingTableError", () => {
  it("detects table-not-found via 'could not find the table'", () => {
    const err = { message: "Could not find the table 'analytics_daily'" };
    expect(isMissingTableError(err, "analytics_daily")).toBe(true);
  });

  it("detects via 'relation' wording", () => {
    const err = { message: 'relation "order_state_events" does not exist' };
    expect(isMissingTableError(err, "order_state_events")).toBe(true);
  });

  it("detects via schema cache hint", () => {
    const err = {
      hint: "schema cache is stale",
      details: "table order_currency_snapshots does not exist",
    };
    expect(isMissingTableError(err, "order_currency_snapshots")).toBe(true);
  });

  it("returns false when table doesn't match", () => {
    const err = { message: 'relation "wrong_table" does not exist' };
    expect(isMissingTableError(err, "right_table")).toBe(false);
  });
});
