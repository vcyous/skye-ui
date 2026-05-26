import { describe, expect, it } from "vitest";
import {
  parseSimpleCsv,
  toCsvValue,
} from "../../../src/services/utils/csvUtils";

describe("toCsvValue", () => {
  it("returns empty string for null/undefined", () => {
    expect(toCsvValue(null)).toBe("");
    expect(toCsvValue(undefined)).toBe("");
  });

  it("returns raw value when no escaping needed", () => {
    expect(toCsvValue("hello")).toBe("hello");
    expect(toCsvValue(42)).toBe("42");
  });

  it("quotes values containing commas", () => {
    expect(toCsvValue("a,b")).toBe('"a,b"');
  });

  it("quotes values containing newlines", () => {
    expect(toCsvValue("a\nb")).toBe('"a\nb"');
  });

  it('escapes inner quotes by doubling them', () => {
    expect(toCsvValue('he said "hi"')).toBe('"he said ""hi"""');
  });
});

describe("parseSimpleCsv", () => {
  it("returns empty result for empty input", () => {
    expect(parseSimpleCsv("")).toEqual({ headers: [], records: [] });
    expect(parseSimpleCsv(null)).toEqual({ headers: [], records: [] });
  });

  it("normalizes headers to snake_case lowercase", () => {
    const { headers } = parseSimpleCsv("First Name,Email\nAda,ada@example.com");
    expect(headers).toEqual(["first_name", "email"]);
  });

  it("parses records into header-keyed objects", () => {
    const { records } = parseSimpleCsv(
      "name,sku,qty\nWidget,SKU-1,10\nGadget,SKU-2,5",
    );
    expect(records).toEqual([
      { name: "Widget", sku: "SKU-1", qty: "10" },
      { name: "Gadget", sku: "SKU-2", qty: "5" },
    ]);
  });

  it("handles quoted fields with embedded commas", () => {
    const { records } = parseSimpleCsv('name,note\n"Smith, John","ok, fine"');
    expect(records[0]).toEqual({ name: "Smith, John", note: "ok, fine" });
  });

  it('unescapes doubled quotes inside quoted fields', () => {
    const { records } = parseSimpleCsv('name\n"he said ""hi"""');
    expect(records[0].name).toBe('he said "hi"');
  });

  it("tolerates CRLF line endings and blank lines", () => {
    const { records } = parseSimpleCsv("a,b\r\n1,2\r\n\r\n3,4\r\n");
    expect(records).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("fills missing trailing values with empty string", () => {
    const { records } = parseSimpleCsv("a,b,c\n1,2");
    expect(records[0]).toEqual({ a: "1", b: "2", c: "" });
  });
});
