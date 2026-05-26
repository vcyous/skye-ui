import { describe, expect, it } from "vitest";
import {
  CREATE_INITIAL_VALUES,
  toCollectionFormValues,
} from "../../../src/features/collections/collectionMapper";

describe("toCollectionFormValues", () => {
  it("returns {} for null input", () => {
    expect(toCollectionFormValues(null)).toEqual({});
  });

  it("maps a manual collection to form values without rules", () => {
    const values = toCollectionFormValues({
      name: "Sale",
      description: "Big sale",
      collectionType: "manual",
      status: "active",
    });
    expect(values.name).toBe("Sale");
    expect(values.collectionType).toBe("manual");
    expect(values.rules).toBeUndefined();
  });

  it("supplies default smart rules when smart collection lacks them", () => {
    const values = toCollectionFormValues({
      name: "Auto",
      collectionType: "smart",
      status: "draft",
    });
    expect(values.rules).toEqual({
      match: "all",
      conditions: [{ field: "name", operator: "contains", value: "" }],
    });
  });

  it("preserves existing rules", () => {
    const customRules = {
      match: "any",
      conditions: [{ field: "vendor", operator: "eq", value: "Acme" }],
    };
    const values = toCollectionFormValues({
      name: "Acme stuff",
      collectionType: "smart",
      status: "active",
      rules: customRules,
    });
    expect(values.rules).toBe(customRules);
  });

  it("normalizes blank handles + descriptions to safe defaults", () => {
    const values = toCollectionFormValues({
      name: "X",
      collectionType: "manual",
      status: "active",
    });
    expect(values.urlHandle).toBe("");
    expect(values.seoTitle).toBe("");
    expect(values.seoDescription).toBe("");
  });
});

describe("CREATE_INITIAL_VALUES", () => {
  it("defaults to a manual draft with the standard smart rule template", () => {
    expect(CREATE_INITIAL_VALUES.collectionType).toBe("manual");
    expect(CREATE_INITIAL_VALUES.status).toBe("draft");
    expect(CREATE_INITIAL_VALUES.rules.match).toBe("all");
    expect(CREATE_INITIAL_VALUES.rules.conditions).toHaveLength(1);
  });
});
