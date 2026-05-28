import { describe, expect, it } from "vitest";
import {
  buildUniqueHandle,
  normalizeSeoHandle,
  slugify,
  validateSeoMetadataFields,
} from "../../../src/services/utils/slugUtils";

describe("slugify", () => {
  it("lowercases and replaces non-alphanumerics with hyphens", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  --Hello-- ")).toBe("hello");
  });

  it("caps length at 50 characters", () => {
    const long = "a".repeat(80);
    expect(slugify(long)).toHaveLength(50);
  });

  it("returns empty string for empty/nullish input", () => {
    expect(slugify("")).toBe("");
    expect(slugify(null)).toBe("");
    expect(slugify(undefined)).toBe("");
  });

  it("collapses runs of separators into a single hyphen", () => {
    expect(slugify("foo___bar   baz")).toBe("foo-bar-baz");
  });
});

describe("buildUniqueHandle", () => {
  it("appends a base36 timestamp to the slug", () => {
    const handle = buildUniqueHandle("Summer Launch");
    expect(handle).toMatch(/^summer-launch-[a-z0-9]+$/);
  });

  it("falls back to 'item-…' when base produces empty slug", () => {
    const handle = buildUniqueHandle("!!!");
    expect(handle).toMatch(/^item-[a-z0-9]+$/);
  });
});

describe("normalizeSeoHandle", () => {
  it("returns slug when input slugifies cleanly", () => {
    expect(normalizeSeoHandle("My Page")).toBe("my-page");
  });

  it("falls back to a unique handle from the fallback when input is empty", () => {
    const handle = normalizeSeoHandle("", "checkout");
    expect(handle).toMatch(/^checkout-[a-z0-9]+$/);
  });
});

describe("validateSeoMetadataFields", () => {
  it("accepts valid metadata", () => {
    expect(() =>
      validateSeoMetadataFields({
        seoTitle: "Good title",
        seoDescription: "Short description",
        urlHandle: "good-handle",
      }),
    ).not.toThrow();
  });

  it("rejects SEO title over 70 chars", () => {
    expect(() =>
      validateSeoMetadataFields({ seoTitle: "x".repeat(71) }),
    ).toThrow(/70 characters/);
  });

  it("rejects SEO description over 160 chars", () => {
    expect(() =>
      validateSeoMetadataFields({ seoDescription: "x".repeat(161) }),
    ).toThrow(/160 characters/);
  });

  it("rejects URL handle that slugifies to nothing", () => {
    expect(() =>
      validateSeoMetadataFields({ urlHandle: "!!!" }),
    ).toThrow(/lowercase/);
  });

  it("accepts inputs that slugify cleanly (uppercase / spaces get normalized)", () => {
    expect(() =>
      validateSeoMetadataFields({ urlHandle: "Bad Handle!" }),
    ).not.toThrow();
  });

  it("accepts the legacy `handle` field name", () => {
    expect(() =>
      validateSeoMetadataFields({ handle: "valid-handle" }),
    ).not.toThrow();
  });
});
